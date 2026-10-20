/** Decode CSV across byte boundaries without corrupting UTF-8 characters. */
export async function readTextBlob(blob, chunkSize=65536, onProgress=()=>{}) {
  if (!blob || typeof blob.size !== 'number' || blob.size===0) throw new Error('空文件');
  if (!Number.isSafeInteger(chunkSize) || chunkSize<1) throw new Error('分块大小无效');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '';
  const totalChunks = Math.ceil(blob.size/chunkSize);
  for(let i=0;i<totalChunks;i++){
    const bytes=await blob.slice(i*chunkSize,(i+1)*chunkSize).arrayBuffer();
    text += decoder.decode(new Uint8Array(bytes), { stream:true });
    onProgress({currentChunk:i+1,totalChunks,pct:Math.round(((i+1)/totalChunks)*100)});
  }
  return text+decoder.decode();
}
