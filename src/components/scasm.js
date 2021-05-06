const schemaEqual = (s1, s2) => {
    if (s1.length !== s2.length) return false;
    return !s1.find((v,i)=>v!==s2[i]);
}
const u16 = n => n & 0xFFFF >>> 0;
const hex4b = n => n.toString(16).padStart(4,'0').toUpperCase();
const generateInstr = (op, da, aa, ba) => u16(((op << 9) & 0xFE00) | ((da << 6) & 0x01C0) | ((aa << 3) & 0x0038) | (ba & 0x0007));

const sldi = (n, r) => {
    if (n === 0) {
        return `//%M SLDI ${r},${n}\nxor ${r},${r},${r}\n//%ENDM`;
    } else if (n === 0xFFFF) {
        return `//%M SLDI ${r},${n}\nxor ${r},${r},${r}\nnot ${r},${r}\n//%ENDM`;
    } else if (n <= 0x0007) {
        return `//%M SLDI ${r},${n}\nldi ${r},${n}\n//%ENDM`;
    }
    let result = `//%M SLDI ${r},${n}\n`;
  
    let ts = [];
  
    for (let o = 13; o >= 1; o -= 3) {
        let t = (n & (0x7 << o)) >>> o;
        if (t === 0 && ts.length < 1)
            continue;
        ts.push(t);
    }
  
    console.log(ts);
  
    ts.forEach((t,i,a)=>{
        if (t > 0 || i === 0)
            result += `${i===0 ? 'ldi ' : `adi ${r},`}${r},${t}\n`;
        if (i < a.length - 1)
            result += [
                `shl ${r},${r}`,
                `shl ${r},${r}`,
                `shl ${r},${r}\n`
            ].join('\n');
    });
  
    result += `shl ${r},${r}\n`;
    if (n & 0x1)
        result += `inc ${r},${r}\n`;
  
    return result + '//%ENDM';
}

export default function scasm(source) {
    return new Promise((resolve, reject)=>{
        let asmhex = '';
        let iasmsrc = '';
        let symboltable = {};
        let lineToAddrMapping = [];

        let caddr = 0;

        source = source.replace(/\r/g,'')
                       .replace(/(?<!\/\/)0b([01]{1,16})/g, (_,nh)=>parseInt(nh, 2).toString(10))
                       .replace(/(?<!\/\/)0o([0-8]{1,5})/g, (_,nh)=>parseInt(nh, 8).toString(10))
                       .replace(/(?<!\/\/)0x([0-9a-fA-F]{1,4})/g, (_,nh)=>parseInt(nh, 16).toString(10))
                       .replace(/^ *%SLDI (r[0-7]), *([0-9]{0,5})$/gm, (_,r,nh)=>sldi(parseInt(nh, 10), r))
                       .replace(/^ *%ISTK$/gm, '//%M ISTK\nxor r7,r7,r7\n//%ENDM')
                       .replace(/^ *%CALL (r[0-7])$/gm, '//%M CALL $1\n%PLDI\ninc r7,r7\nst r7,r6\njmp $1\n//%ENDM')
                       .replace(/^ *%RET$/gm, '//%M RET\nld r6,r7\ndec r7,r7\njmp r6\n//%ENDM');

        console.log('pass 0', source);

        let lines = source.split('\n');
        let lineidx = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            console.log(caddr, i, lineidx, line);
            if (!line) continue;
            let args = line.replace(/\/\/.*/g,'').trim().split(' ').filter(a=>a);
            if (args.length < 1) continue;
            if (args[0] == '%PLDI') {
                let pcli = sldi(caddr, 'r6').split('\n').filter(l=>l);
                console.log('pldi resolve', pcli);
                console.log('pldi before', lines);
                lines.splice(i, 1, ...pcli);
                console.log('pldi after', lines);
                i--;
                lineidx -= pcli.length;
                continue;
            }
            if (args[0].startsWith('.')) {
                let lbl = args[0].replace(/^\.([A-Za-z_][A-Za-z0-9_]*):$/, '$1');
                if (!lbl) reject(`line ${lineidx+1}: invalid label name`);
                if (Object.keys(symboltable).includes(lbl)) reject(`line ${lineidx+1}: duplicate symbol definition .${lbl}`)
                symboltable[lbl] = caddr;
            } else caddr++;
            lineidx++;
        }

        source = lines.join('\n')
                      .replace(/^ *%SLDI (r[0-7]), *\.([A-Za-z_][A-Za-z0-9_]*)$/gm, (_,r,s)=>sldi(parseInt(symboltable[s], 10), r))

        iasmsrc = source.split('\n')
                        .map(l=>l.trim())
                        .join('\n')
                        .replace(/^( *\.[A-Za-z_][A-Za-z0-9_]+:)/gm, '//$1');
        
        console.log('iasm', iasmsrc);

        caddr = 0;
        lineidx = 0;
        let macroDepth = 0;
        source.split('\n').forEach(line=>{
            if (macroDepth == 0) {
                lineidx++;
            }
            if (!line) return;
            if (line.startsWith('//%M')) {
                macroDepth++;
            } else if (line.startsWith('//%ENDM')) {
                macroDepth--;
                if (macroDepth == 0) {
                    //lineidx++;
                }
            }
            let args = line.replace(/\/\/.*/g,'').trim().split(' ').filter(a=>a);
            console.log(macroDepth, args);
            if (args.length < 1) return;
            if (args[0].startsWith('.')) return;
            else {
                lineToAddrMapping.push(lineidx);
                console.log(lineToAddrMapping);
                let [op, ...opargs] = args;
                opargs = opargs.join('').replace(/\s/g,'').split(',');
                let opargv = opargs.map(opa=>parseInt(opa.replace(/[Rr]/g,'')));
                console.log(opargs, opargv);
                let opargt = opargs.map((opa,i)=>{
                    console.log('op', i, opa);
                    if ((opa.startsWith('r') || opa.startsWith('R')) && opargv[i] >= 0 && opargv[i] <= 7)
                        return 'reg';
                    else if (opa.startsWith('.') && Object.keys(symboltable).includes(opa.replace('.','')))
                        return 'addr';
                    else if (opa.startsWith('.'))
                        return reject(`line ${lineidx}: Undefined symbol ${opa}`)
                    else if (!isNaN(opargv[i]) && opargv[i] >= 0 && opargv[i] <= 7)
                        return 'imm';
                    else if (!isNaN(opargv[i])) 
                        return 'off';
                    else
                        return reject(`line ${lineidx}: Unknown argument ${opargs[i]}\n${line}`);
                });

                switch (op.toLowerCase()) {
                    case 'mova':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for mova`);
                        asmhex += hex4b(generateInstr(0x00, opargv[0], opargv[1], 0));
                        break;
                    case 'inc':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for inc`);
                        asmhex += hex4b(generateInstr(0x01, opargv[0], opargv[1], 0));
                        break;
                    case 'add':
                        if (!schemaEqual(opargt, ['reg','reg','reg'])) reject(`line ${lineidx}: Invalid args for add`);
                        asmhex += hex4b(generateInstr(0x02, opargv[0], opargv[1], opargv[2]));
                        break;
                    case 'sub':
                        if (!schemaEqual(opargt, ['reg','reg','reg'])) reject(`line ${lineidx}: Invalid args for sub`);
                        asmhex += hex4b(generateInstr(0x05, opargv[0], opargv[1], opargv[2]));
                        break;
                    case 'dec':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for dec`);
                        asmhex += hex4b(generateInstr(0x06, opargv[0], opargv[1], 0));
                        break;
                    case 'and':
                        if (!schemaEqual(opargt, ['reg','reg','reg'])) reject(`line ${lineidx}: Invalid args for and`);
                        asmhex += hex4b(generateInstr(0x08, opargv[0], opargv[1], opargv[2]));
                        break;
                    case 'or':
                        if (!schemaEqual(opargt, ['reg','reg','reg'])) reject(`line ${lineidx}: Invalid args for or`);
                        asmhex += hex4b(generateInstr(0x09, opargv[0], opargv[1], opargv[2]));
                        break;
                    case 'xor':
                        if (!schemaEqual(opargt, ['reg','reg','reg'])) reject(`line ${lineidx}: Invalid args for xor`);
                        asmhex += hex4b(generateInstr(0x0A, opargv[0], opargv[1], opargv[2]));
                        break;
                    case 'not':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for not`);
                        asmhex += hex4b(generateInstr(0x0B, opargv[0], opargv[1], 0));
                        break;
                    case 'movb':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for movb`);
                        asmhex += hex4b(generateInstr(0x0C, opargv[0], 0, opargv[1]));
                        break;
                    case 'shr':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for shr`);
                        asmhex += hex4b(generateInstr(0x0D, opargv[0], 0, opargv[1]));
                        break;
                    case 'shl':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for shl`);
                        asmhex += hex4b(generateInstr(0x0E, opargv[0], 0, opargv[1]));
                        break;
                    case 'ldi':
                        if (schemaEqual(opargt, ['reg','addr'])) {
                            opargv[1] = symboltable[opargs[1].replace('.','')];
                        } else if (!schemaEqual(opargt, ['reg','imm'])) reject(`line ${lineidx}: Invalid args for ldi`);
                        asmhex += hex4b(generateInstr(0x4C, opargv[0], 0, opargv[1]));
                        break;
                    case 'adi':
                        if (schemaEqual(opargt, ['reg','addr'])) {
                            opargv[1] = symboltable[opargs[1].replace('.','')];
                        } else if (!schemaEqual(opargt, ['reg','reg','imm'])) reject(`line ${lineidx}: Invalid args for adi`);
                        asmhex += hex4b(generateInstr(0x42, opargv[0], opargv[1], opargv[2]));
                        break;
                    case 'ld':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for ld`);
                        asmhex += hex4b(generateInstr(0x10, opargv[0], opargv[1], 0));
                        break;
                    case 'st':
                        if (!schemaEqual(opargt, ['reg','reg'])) reject(`line ${lineidx}: Invalid args for st`);
                        asmhex += hex4b(generateInstr(0x20, 0, opargv[0], opargv[1]));
                        break;
                    case 'brz':
                        console.log(opargt);
                        if (schemaEqual(opargt, ['reg','addr'])) {
                            opargv[1] = symboltable[opargs[1].replace('.','')] - caddr;
                        } else if (!schemaEqual(opargt, ['reg','imm']) && !schemaEqual(opargt, ['reg','off'])) reject(`line ${lineidx}: Invalid args for brz`);
                        if (opargv[1] >= 0x20 || opargv[1] < -0x20) throw new Error(`line ${lineidx}: Branch too far\n  (tried to branch ${opargv[1]})`);
                        let brz_off = (opargv[1] >>> 0) & 0x3F;
                        console.log(brz_off, (brz_off >>> 3) & 0x7, (brz_off >>> 0) & 0x7);
                        asmhex += hex4b(generateInstr(0x60, (brz_off >>> 3) & 0x7, opargv[0], (brz_off >>> 0) & 0x7));
                        break;
                    case 'brn':
                        if (schemaEqual(opargt, ['reg','addr'])) {
                            if (!Object.keys(symboltable).includes(opargs[1].replace('.',''))) throw new Error(`line ${lineidx}: Undefined symbol ${opargs[1]}`)
                            opargv[1] = symboltable[opargs[1].replace('.','')] - caddr;
                        } else if (!schemaEqual(opargt, ['reg','imm']) && !schemaEqual(opargt, ['reg','off'])) reject(`line ${lineidx}: Invalid args for brn`);
                        let brn_off = opargv[1] & 0x3F;
                        asmhex += hex4b(generateInstr(0x61, (brn_off >>> 3) & 0x7, opargv[0], (brn_off >>> 0) & 0x7));
                        break;
                    case 'jmp':
                        if (!schemaEqual(opargt, ['reg'])) reject(`line ${lineidx}: Invalid args for jmp`);
                        asmhex += hex4b(generateInstr(0x70, 0, opargv[0], 0));
                        break;
                }
                caddr++;
            }
        });

        lineToAddrMapping.pop();

        /*
        Object.keys(symboltable).forEach(s=>{
            iasmsrc = iasmsrc.replace(new RegExp(`\\.${s}(?!:)`, 'g'), symboltable[s]);
        }); */

        macroDepth = 0, caddr = 0;
        iasmsrc = iasmsrc.split('\n').map(line=>{
            if (!line || line.trim().startsWith('//'))
                return line;
            caddr++;
            return line.replace(/(br[zn]) +(r[0-7]), *\.([A-Za-z_][A-Za-z0-9_]*)/, (l,i,r,s)=>(
                `${i} ${r},${symboltable[s] - caddr + 1} //${l}`
            )).trim();
        }).join('\n');

        resolve({
            asmhex,
            symboltable,
            iasmsrc,
            lineToAddrMapping
        });
    })
    
}