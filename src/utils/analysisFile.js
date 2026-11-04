import {projectView} from './viewConfig.js';
import {datasetSchema,viewCompatibility} from './viewCompatibility.js';

const fieldKeys=['name','type','role','unit','currency','percentScale','precisionProtected'];
function projectDataset(dataset) {
  if(!dataset || !Array.isArray(dataset.fields) || !dataset.fields.length || !Array.isArray(dataset.rows)) throw new Error('分析文件缺少数据字段或记录');
  const names=new Set();
  const fields=dataset.fields.map(field=>{
    if(typeof field?.name!=='string' || !field.name.trim() || names.has(field.name) || !['text','number','date','boolean'].includes(field.type)) throw new Error('数据字段名称重复或类型无效');
    names.add(field.name);
    if(field.role!==undefined && !['dimension','measure'].includes(field.role))throw new Error(`字段角色无效：${field.name}`);
    for(const key of ['unit','currency'])if(field[key]!==undefined && (typeof field[key]!=='string' || field[key].length>40))throw new Error(`字段单位无效：${field.name}`);
    if(field.percentScale!==undefined && !['none','whole','fraction'].includes(field.percentScale))throw new Error(`字段数值尺度无效：${field.name}`);
    return Object.fromEntries(fieldKeys.filter(key=>field[key]!==undefined).map(key=>[key,field[key]]));
  });
  const rows=dataset.rows.map((row,index)=>{
    if(!row || typeof row!=='object' || Array.isArray(row)) throw new Error(`第 ${index+1} 条记录格式无效`);
    return Object.fromEntries(fields.map(field=>{
      const value=Object.hasOwn(row,field.name) ? row[field.name] : null;
      if(value!==null && value!==undefined && !['string','number','boolean'].includes(typeof value)) throw new Error(`第 ${index+1} 条记录包含不支持的值：${field.name}`);
      if(typeof value==='number' && !Number.isFinite(value)) throw new Error(`第 ${index+1} 条记录包含非有限数值：${field.name}`);
      return [field.name,value ?? null];
    }));
  });
  return {name:typeof dataset.name==='string' ? dataset.name : '已保存的数据',fields,rows};
}

export function createAnalysisFile(dataset,sourceView) {
  const data=projectDataset(dataset);
  const view=projectView({...sourceView,schema:datasetSchema(data)});
  const problems=viewCompatibility(view.fullConfig,view.schema,data,{allFields:true,chartConfig:view.csc?.analysisConfig});
  if(problems.length)throw new Error(problems.join('；'));
  return {kind:'pivotstudio-analysis',version:1,dataset:data,view};
}

export function parseAnalysisFile(text) {
  let source;
  try {source=JSON.parse(text);}catch {throw new Error('分析文件不是有效的 JSON');}
  if(source?.kind!=='pivotstudio-analysis' || source.version!==1)throw new Error('不支持的分析文件格式或版本，请选择 .pivotstudio.json 文件');
  if(!source.view?.fullConfig || !Array.isArray(source.view.schema))throw new Error('分析文件缺少透视配置或字段结构');
  const dataset=projectDataset(source.dataset);
  const view=projectView(source.view);
  const problems=viewCompatibility(view.fullConfig,view.schema,dataset,{allFields:true,chartConfig:view.csc?.analysisConfig});
  if(problems.length)throw new Error('分析文件中的数据与配置不匹配：'+problems.join('；'));
  return {dataset,view:{...view,schemaMode:'all'}};
}
