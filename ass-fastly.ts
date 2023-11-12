
export function ASS2VTT(str:string):string{

    interface Meta {
        width   :number,
        height  :number,
        title   ?:string
    }

    const meta:Meta = {width:0,height:0},
        style:Record<string,string> = {};
    let vtt = '';

    function normalParse(data:string){
        const temp:Record<string,string> = {};
        for(const line of data.split('\n')){
            const pos = line.indexOf(':');
            temp[line.substring(0,pos).trim().toLowerCase()] = line.substring(pos+1).trim();
        }
        return temp;
    }

    function after(symbol:string,content:string){
        const pos = content.indexOf(symbol);
        return content.substring(pos+1);
    }

    function* splitWithin(max:number,find:string,data:string):Iterable<string>{
        let pos = 0,pos2 = data.indexOf(find);
        for (let i = 0; i < max; i++) {
            if(i == max-1 || pos2 < 0) return yield data.substring(pos);
            yield data.substring(pos,pos2);
            pos = pos2+find.length,pos2 = data.indexOf(find,pos);
        }
    }

    function* parseBlock(content:string,filter?:(type:string)=>boolean){
        const lines = content.split('\n'),
            format = after(':',lines.shift()||':')?.toLowerCase()?.split(',');
        if(!format) throw new TypeError('Wrong ASS');
        for (const line of lines) {
            if(filter && !filter(line.split(':',1)[0].trim())) continue;
            const data = [...splitWithin(format.length,',',after(':',line))],
                current:Record<string,string> = {};
            if(data.length < format.length){
                console.log(data,format);
                throw new TypeError('ASS:Length('+data.length+':'+format.length+') unmatched.');
            }
            for (let i = 0; i < format.length; i++)
                current[format[i].trim().toLowerCase()] = data[i].trim();
            current.input = line;
            yield current;
        }
    }

    function buildCSS(content:string):void{
        for(const thisstyle of parseBlock(content,data=>data.toLowerCase() == 'style')){
            let currentstyle = '';
            // Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding

            if (thisstyle.fontname)     currentstyle += `\tfont-family: "${thisstyle.fontname}";\n`;
            if (thisstyle.fontsize)     currentstyle += `\tfont-size: ${thisstyle.fontsize}px;\n`;
            if (thisstyle.primarycolor) currentstyle += `\tcolor: #${thisstyle.primarycolor};\n`;
            if (thisstyle.alignment)    currentstyle += `\ttext-align: ${
                {1: 'left',2: 'center',3: 'right'}[thisstyle.alignment] || 'center'
            };\n`;

            if (thisstyle.bold == '1')
                currentstyle += `\tfont-weight: bold;\n`;
            if (thisstyle.italic == '1')
                currentstyle += '\tfont-style: italic;\n';
            if (thisstyle.underline == '1')
                currentstyle += '\ttext-decoration: underline;\n';

            if (thisstyle.borderstyle == '1') {
                const size = parseInt(thisstyle.outline || '1'),
                    ssize = parseInt(thisstyle.shadow || '1'),
                    shadow = colorRepack(thisstyle.backcolur || thisstyle.backcolour || '&H9b9a9a'),
                    stroke = colorRepack(thisstyle.outlinecolor || thisstyle.outlinecolour || '&H000000');
                // 使用text-shadow实现描边和阴影
                let shadowStyle = '';
                if(!stroke.endsWith('00')) shadowStyle += `${stroke} ${size}px 0 0,${stroke} 0 ${size}px 0,${stroke} -${size}px 0 0,${stroke} 0 -${size}px 0,${stroke} ${size}px ${size}px 0,${stroke} -${size}px -${size}px 0,${stroke} ${size}px -${size}px 0,${stroke} -${size}px ${size}px 0,`;
                if(!shadow.endsWith('00')) shadowStyle += `${shadow} 0 0 ${ssize}px,`
                if(shadowStyle.length)
                    currentstyle += '\ttext-shadow: ' + shadowStyle.substring(0,currentstyle.length -1) + ';\n';
            }else if(thisstyle.borderstyle == '3'){
                const color = '#' + (thisstyle.backcolur || thisstyle.backcolour || '&H9b9a9a').substring(2);
                currentstyle += `\tbackground-color: ${color};\n`;
            }
            style[thisstyle.name] = currentstyle;
        }
    }

    interface processedText {
        style:string,
        text:string,
        id:string
    };

    function processText(asstext:string):processedText{
        let style = '';
        return {
            text:asstext.replaceAll(/\{([\s\S]*?)\}/g,function(...value):string{
                // value[1].matchAll(/\\(\s+)\((.+?)\)/ig);
                const pos = value[1].match(/\\pos\(([0-9]+),([0-9]+)\)/i);
                if(pos){
                    const xpos = (parseInt(pos[1]) * 100 / meta.width).toFixed(1) + '%',
                        ypos = (parseInt(pos[2]) * 100 / meta.height).toFixed(1) + '%';
                    style = ` line:${ypos} position:${xpos} align:left `;
                }
                return '';
            }).replaceAll('\\N','\n ').replaceAll('\\n',' '),
            style,
            id:''
        }
    }

    function parseContent(content:string){
        if (meta.width == 0 || meta.height == 0)
            throw new Error('Canvas Overflow.Make sure you have defined the [Script Info] field.')
        for (const line of parseBlock(content, data => data.toLowerCase() == 'dialogue')) {
            if (line.start == line.end) continue;
            const text = processText(line.text);
            if (text.text.startsWith('m')) continue;
            vtt += `${text.id}\n${timeRepack(line.start)} --> ${timeRepack(line.end)} ${text.style}\n` +
                (line.style ? `<c.${line.style}>${text.text}</c>\n\n` : `${text.text}\n\n`);
        }
    }

    function timeRepack(assTime:string):string{
        const match = assTime.match(/^([0-9]+\:)*([0-9]+)(\.([0-9]+))?$/i);
        if(!match) throw new Error('illegal timestrap '+assTime);
        const [,time,sec,,msec] = match;
        return time+sec+'.'+msec.padStart(3,'0');
    }

    function colorRepack(assColor:string){
        let match = assColor.match(/\&?H?(\S\S)(\S\S)(\S\S)(\S\S)?\&?/i);
        if(!match) return '#000';
        return '#'+match[3]+match[2]+match[1]+(match[4] || '');
    }

    const processedStr = (str+'\n').replaceAll('\r\n','\n').replaceAll(/\n\;[\s\S]+?\n/g,'\n'),
        matched = processedStr.matchAll(/\[(.+)\]\n([\s\S]+?)\n\n/g);
    let contentText = '';
    for (const [,name,content] of matched) {
        console.log(name);
        if(name.toLowerCase() == 'script info'){
            const tmp = normalParse(content);
            meta.width = parseInt(tmp.playresx || "1920"),
            meta.height = parseInt(tmp.playresy || "1080"),
            meta.title = tmp.title;
            vtt += `NOTE\ncreated by ass2vtt\nraw-size:${meta.width}*${meta.height}\n\n`;
        }else if(name.toLowerCase().endsWith('styles')){
            buildCSS(content);
        }else if(name.toLowerCase() == 'events'){
            contentText = content;
        }else console.warn('Unknown Block',name);
    }
    parseContent(contentText);

    return `WEBVTT - ${meta.title || 'ass2vtt 1.0'}\n\n`+(function():string{
        let tmp = '';
        for (const classname in style)
            tmp += `STYLE\n::cue(.${classname.replaceAll('-','_')}){\n${style[classname]}\n}\n\n`;
        return tmp;
    })()+vtt.replaceAll('\n\n','\n');
}