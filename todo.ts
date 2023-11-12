let map = {
    b:(val:string) => css += `\tfont-weight: ${val == '1' ? 'bold' : 'normal'};\n`,
    i:(val:string) => css += `\tfont-style: ${val == '1' ? 'italic' : 'normal'};\n`,
    u:(val:string) => css += `\ttext-decoration: ${val == '1' ? 'underline' : 'none'};\n`,
    s:(val:string) => css += `\tfont-style: ${val == '1' ? 'line-through' : 'none'};\n`,
    bord:(val:string) => tmp.bwidth = val + 'px',
    shad:(val:string) => tmp.swidth = val + 'px',
    fn:(val:string) => css += `\tfont-family: "${val}";\n`,
    fs:(val:string) => css += `\tfont-size: ${val}px;\n`,
    fsp:(val:string) => css += `\tletter-spacing: ${val == '1' ? 'bold' : 'normal'}`,
    b:(val:string) => css += `font-weight: ${val == '1' ? 'bold' : 'normal'}`,
},tmp = {};
for (const iterator of value[1].matchAll(/\\(fn|fs)(.*)\\/ig)) {
    
}