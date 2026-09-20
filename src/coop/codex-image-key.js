// Shared by the offline exporter and the catalogue; never load combat atlases here.
export function codexImageKey(art){
 const value=art?.type==='hero'?art.role:art?.type==='equipment'?(art.style||art.key):art?.type==='enemy'?(art.kind||art.key):art?.key;
 if(!['hero','equipment','enemy','icon'].includes(art?.type)||!value||!/^[a-z0-9_-]+$/i.test(value))throw Error('无效图鉴插画');
 return `${art.type}-${value}`;
}
