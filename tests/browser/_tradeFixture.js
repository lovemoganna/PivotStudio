// Synthetic accounts/orders; mirrors the reported schema without publishing user records.
export const tradeHeaders=['序号','创建时间','用户主账户id','用户id','账户类型','KA名单','豁免用户名单','pep用户名单','币对id','对手用户id','对手账户类型','订单id','订单类型','委托类型','买入金额','卖出金额','总成交金额','买入数量','卖出数量','买入均价_折U','卖出均价_折u'];
const row=(n,time,counter,order,side,buy,sell,buyQty,sellQty)=>[n,time,'1000000000001','1000000000001','普通用户','否','否','否','ASSET_QUOTE',counter,counter==='1000000000002'?'普通用户':'外部做市商',order,'限价单',side,buy,sell,buy+sell,buyQty,sellQty,side==='买入'?.2:'',side==='卖出'?.2:''];
const records=[
 row(2,'2026-10-31 14:32:26','1000000000002','9007199254740993001','卖出',0,10,0,50),
 row(3,'2026-10-31 14:32:28','1000000000003','9007199254740993001','卖出',0,20,0,100),
 row(4,'2026-10-31 18:42:43','1000000000003','9007199254740993002','买入',40,0,200,0),
 row(5,'2026-10-31 23:01:33','1000000000003','9007199254740993003','卖出',0,30,0,150),
];
const summary=Array(21).fill('');summary[0]=1;summary[1]='总计';summary[14]=40;summary[15]=60;summary[16]=100;summary[17]=200;summary[18]=300;summary[19]=.2;summary[20]=.2;
export const tradeCsv=[tradeHeaders,summary,...records].map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n');
