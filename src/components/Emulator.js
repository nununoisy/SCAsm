import React from 'react';
import HexEditor from 'react-hex-editor';
import oneDarkPro from 'react-hex-editor/themes/oneDarkPro';

import scasm from './scasm';

const u16 = n => n & 0xFFFF >>> 0;
const endianSwap = n => (((n & 0xFF) << 8) | ((n >>> 8) & 0xFF)) >>> 0;
const hex4b = n => n.toString(16).padStart(4,'0').toUpperCase();

class SimpleComputer {
    /**
     * Create a SimpleComputer CPU
     * @param {string} bin Program code as a hexadecimal string
     * @param {ArrayBuffer} [dtMem] - initial data memory (default all 0)
     * @param {boolean} [noBranching] - if true do not branch (used for disassembler)
     */
    constructor(bin, dtMem, noBranching) {
        this.pgMem = new Uint16Array(0x10000).fill(0);
        this.dtMem = new Uint16Array(dtMem) || new Uint16Array(0x10000).fill(0);
        
        this.reset = this.reset.bind(this);
        this.reset();

        this.noBranching = noBranching;

        this._instr = "";
        this._args = [];

        let instrs = (bin.match(/[0-9a-fA-F]{4}/g) || []);

        this._pgLength = instrs.length;

        instrs.forEach((hexWord,offset)=>{
            this.pgMem[offset] = u16(parseInt(hexWord, 16));
        });
    }

    reset() {
        this.r = new Uint16Array(8).fill(0);

        this.pc = 0;
        this._br = 0;
        this.ir = 0;
        this.op = 0;
        this.da = 0;
        this.aa = 0;
        this.ba = 0;
        this.flags = {
            v: false,
            c: false,
            n: false,
            z: false
        }
    }

    _setFlags(v,c,n,z) {
        this.flags.v = v;
        this.flags.c = c;
        this.flags.n = n;
        this.flags.z = z;
    }

    executeCycle() {
        if (this.pc >= this._pgLength) return false;

        this.ir = this.pgMem[u16(this.pc)];
        this.op = (this.ir & 0xFE00) >>> 9;
        this.da = (this.ir & 0x01C0) >>> 6;
        this.aa = (this.ir & 0x0038) >>> 3;
        this.ba = (this.ir & 0x0007) >>> 0;
        this._br = false;
        let addr = (this.da << 3) | this.ba;
        if (addr & 0x20)
            addr = -((~addr + 1) & 0x003F);

        switch (this.op) {
            case 0x00:
                this._instr = "MOVA";
                this._args = [`r${this.da}`, `r${this.aa}`];
                this.r[this.da] = u16(this.r[this.aa]);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x01:
                this._instr = "INC";
                this._args = [`r${this.da}`, `r${this.aa}`];
                this.r[this.da] = u16(this.r[this.aa] + 1);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x02:
                this._instr = "ADD";
                this._args = [`r${this.da}`, `r${this.aa}`, `r${this.ba}`];
                this.r[this.da] = u16(this.r[this.aa] + this.r[this.ba]);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x05:
                this._instr = "SUB";
                this._args = [`r${this.da}`, `r${this.aa}`, `r${this.ba}`];
                this.r[this.da] = u16(this.r[this.aa] - this.r[this.ba]);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x06:
                this._instr = "DEC";
                this._args = [`r${this.da}`, `r${this.aa}`];
                this.r[this.da] = u16(this.r[this.aa] - 1);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x08:
                this._instr = "AND";
                this._args = [`r${this.da}`, `r${this.aa}`, `r${this.ba}`];
                this.r[this.da] = u16(this.r[this.aa] & this.r[this.ba]);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x09:
                this._instr = "OR";
                this._args = [`r${this.da}`, `r${this.aa}`, `r${this.ba}`];
                this.r[this.da] = u16(this.r[this.aa] | this.r[this.ba]);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x0A:
                this._instr = "XOR";
                this._args = [`r${this.da}`, `r${this.aa}`, `r${this.ba}`];
                this.r[this.da] = u16(this.r[this.aa] ^ this.r[this.ba]);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x0B:
                this._instr = "NOT";
                this._args = [`r${this.da}`, `r${this.aa}`];
                this.r[this.da] = u16(~this.r[this.aa]);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x0C:
                this._instr = "MOVB";
                this._args = [`r${this.da}`, `r${this.ba}`];
                this.r[this.da] = u16(this.r[this.ba]);
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x0D:
                this._instr = "SHR";
                this._args = [`r${this.da}`, `r${this.ba}`];
                this.r[this.da] = u16(this.r[this.ba] >> 1);
                this._setFlags(false,false,false,false);
                break;
            case 0x0E:
                this._instr = "SHL";
                this._args = [`r${this.da}`, `r${this.ba}`];
                this.r[this.da] = u16(this.r[this.ba] << 1);
                this._setFlags(false,false,false,false);
                break;
            case 0x4C:
                this._instr = "LDI";
                this._args = [`r${this.da}`, `${this.ba}`];
                this.r[this.da] = this.ba & 0x0007 >>> 0;
                this._setFlags(false,false,false,false);
                break;
            case 0x42:
                this._instr = "ADI";
                this._args = [`r${this.da}`, `r${this.aa}`, `${this.ba}`];
                this.r[this.da] = u16(this.r[this.aa] + (this.ba & 0x0007));
                this._setFlags(false,false,!!(this.r[this.da] & 0x8000),this.r[this.da]===0);
                break;
            case 0x10:
                this._instr = "LD";
                this._args = [`r${this.da}`, `r${this.aa}`];
                this.r[this.da] = endianSwap(u16(this.dtMem[u16(this.r[this.aa])]));
                this._setFlags(false,false,false,false);
                break;
            case 0x20:
                this._instr = "ST";
                this._args = [`r${this.aa}`, `r${this.ba}`];
                this.dtMem[u16(this.r[this.aa])] = endianSwap(u16(this.r[this.ba]));
                this._setFlags(false,false,false,false);
                break;
            case 0x60:
                this._instr = "BRZ";
                this._args = [`r${this.aa}`, `${addr}`];
                if (this.r[this.aa] === 0) {
                    this._br = u16(this.pc + addr);
                }
                this._setFlags(false,false,false,false);
                break;
            case 0x61:
                this._instr = "BRN";
                this._args = [`r${this.aa}`, `${addr}`];
                if (this.r[this.aa] & 0x8000) {
                    this._br = u16(this.pc + addr);
                }
                this._setFlags(false,false,false,false);
                break;
            case 0x70:
                this._instr = "JMP";
                this._args = [`r${this.aa}`];
                this._br = this.r[this.aa] >>> 0;
                this._setFlags(false,false,false,false);
                break;
            default:
                console.log(`HALT: bad opcode ${this.op.toString(16).padStart(2,'0').toUpperCase()}`);
                process.exit(1);
        }
        console.log(`${hex4b(this.pc)}: ${hex4b(this.ir)} ${this._instr.padEnd(4,' ')} ${this._args.join(',').padEnd(8,' ')} ${Array.from(this.r).map((rv,i)=>`r${i}: ${hex4b(u16(rv))}`).join(' ')} ${this.flags.v ? 'V' : ' '}${this.flags.c ? 'C' : ' '}${this.flags.n ? 'N' : ' '}${this.flags.z ? 'Z' : ' '}`);
        if (this._br && this._br == this.pc && !this.noBranching)
            return false;
        if (this._br && !this.noBranching)
            this.pc = this._br;
        else
            this.pc++;
        return true;
    }
}

const generatePrettyAsmhex = (asmhex, symboltable) => {
    //return `@0\n${((asmhex || '').match(/.{4}/g) || []).join('\n')}`;
    return [
        '// Assembled with SCAsm',
        '// github.com/nununoisy/scasm',
        Object.keys(symboltable).length > 0 ? '// Symbols:' : '// No symbols used',
        ...Object.keys(symboltable).map((k,i)=>`//  ${i.toString().padStart(3,' ')}: .${k} at ${symboltable[k].toString(16).padStart(4,'0').toUpperCase()}`),
        '@0',
        ...((asmhex || '').match(/.{4}/g) || [])
    ].join('\n');
}

const scdisasm = (prghex) => {
    prghex = prghex.replace(/^\/\/.*$/gm, '');
    let sc = new SimpleComputer(prghex, null, true);
    let cont = true;
    let result = '// Disassembled with SCDisasm\n// github.com/nununoisy/scasm\n';
    while (cont) {
        cont = sc.executeCycle();
        if (cont) result += `${sc._instr.padEnd(4,' ').toLowerCase()} ${sc._args.join(',')}\n`;
    }
    return result;
}

const generateRawASM = (asm, symboltable) => {
    let rawASM = '// Generated by SCAsm converter\n// github.com/nununoisy/scasm\n', pc = 0;
    asm.split('\n').forEach(line=>{
        line = line.trim();
        console.log(line, symboltable);
        let lbls = line.match(/(?<!ABC)\.(.+) *(?:,|$)/g) || [];
        console.log(lbls);
        if (lbls.length > Object.keys(symboltable).length) return;
        let syms = lbls.map(l=>symboltable[l.substr(1, l.length - 2)]); //.map(l=>symboltable[l]);
        console.log(syms);
        if (line.startsWith('.') && line.endsWith(':')) {
            rawASM += `//${line} $${(syms[0] || pc).toString(16).padStart(4,'0')}\n`
        } else if (lbls && lbls.length > 0) {
            rawASM += `//${line}\n`;
            rawASM += `${line.replace(/\.(.+) *(?:,|$)/g, (_,sym)=>(symboltable[sym] - (line.startsWith('br') ? pc + 1 : 0)))}\n`;
        } else if (line.length > 0) {
            rawASM += `${line}\n`;
        }
        if (!line.length < 1 && !line.startsWith('//'))
            pc++;
    });
    return rawASM;
}

export default function Emulator(props) {
    const { asmsource, onShouldHighlightLine, onSymbolTableChange, onDisassembly, onLineToAddrMapping } = props;

    const [asmhex, setAsmhex] = React.useState('');
    const [symboltable, setSymboltable] = React.useState({});
    const [lineToAddrMapping, setLineToAddrMapping] = React.useState([]);
    const [error, setError] = React.useState('');
    const [scasmint, setScasmint] = React.useState(null);
    const [scInst, setScInst] = React.useState(null);
    const [scexeint, setScexeint] = React.useState(null);
    const [resetNonce, setResetNonce] = React.useState(null);
    
    const [scState, setScState] = React.useState(null);
    const [scRun, setScRun] = React.useState(false);
    const [scHalted, setScHalted] = React.useState(true);
    const [scStep, setScStep] = React.useState(false);
    
    const [symbolTableReady, setSymbolTableReady] = React.useState(false);
    const [iasmsrc, setIasmsrc] = React.useState('');

    const dtMem = React.useMemo(()=>new ArrayBuffer(0x20000), []);
    const dtMemUI8 = React.useMemo(()=>new Uint8Array(dtMem), []);
    const [dthexNonce, setDthexNonce] = React.useState(0);
    const hexEditorRef = React.useRef(null);
    const [hexEditorGotoVal, setHexEditorGotoVal] = React.useState('0000');

    const dthexEditHandler = React.useCallback((offset, value)=>{
        dtMemUI8[offset] = value;
        setDthexNonce(v=>(v+1));
    })

    React.useEffect(()=>{
        setScInst(null);
        setScState(null);
        setSymbolTableReady(false);
        if (onShouldHighlightLine) onShouldHighlightLine(null);
        if (scasmint) {
            window.clearInterval(scasmint);
        }
        setScasmint(setTimeout(()=>scasm(asmsource).then(scasmr=>{
            setScasmint(null);
            setAsmhex(scasmr.asmhex);
            setSymboltable(scasmr.symboltable);
            setIasmsrc(scasmr.iasmsrc);
            setSymbolTableReady(true);
            if (onSymbolTableChange) onSymbolTableChange(scasmr.symboltable);
            setLineToAddrMapping(scasmr.lineToAddrMapping);
            if (onLineToAddrMapping) onLineToAddrMapping(scasmr.lineToAddrMapping);
            setScInst(new SimpleComputer(scasmr.asmhex, dtMem));
            setError('');
        }).catch(e=>{
            setError(e);
            setScasmint(null);
        }), 1000));
    }, [asmsource, resetNonce]);

    const scRunCycle = () => {
        if (scRun || scStep) {
            setScStep(false);
            let cont = scInst.executeCycle();
            setScState({
                pc: scInst.pc,
                ir: scInst.ir,
                r: Array.from(scInst.r),
                flags: scInst.flags
            });
            if (!cont) {
                setScRun(false);
                setScHalted(true);
            } else {
                if (onShouldHighlightLine) onShouldHighlightLine(lineToAddrMapping[scInst.pc]);
            }
        }
    };

    React.useEffect(()=>{
        if (scexeint) clearInterval(scexeint);
        if (scInst && scRun) {
            if (scHalted) {
                setScHalted(false);
                scInst.reset();
            }
            setScexeint(setInterval(scRunCycle, 50));
        } else {
            setScexeint(null);
            if (scRun) setScState(null);
        }
    }, [scInst, scRun]);

    React.useEffect(()=>{
        console.log('scStep', scStep);
        if (scStep) {
            setScRun(false);
            setScStep(false);
            scRunCycle();
        }
    }, [scStep]);

    return (
        <>
            <div className='emulator-display-container'>
                <pre className={`emulator-display${error ? ' emulator-display-error' : ''}`}>
                    <code>
                        {(scasmint || !symbolTableReady) ? 'Assembling...' : error ? 'Error: ' + error.toString() : `// SCAsm intermediate assembly\n// github.com/nununoisy/scasm\n${iasmsrc}` /* generateRawASM(asmsource, symboltable) */}
                    </code>
                </pre>
                <pre className={`emulator-display${error ? ' emulator-display-error' : ''}`}>
                    <code>
                        {(!error && (scasmint || !symbolTableReady)) ? 'Assembling...' : error ? 'Error: ' + error.toString() : generatePrettyAsmhex(asmhex,symboltable)}
                    </code>
                </pre>
            </div>
            <div className="emu-region">
                <div className="emu-controls">
                    <div className="emu-control-buttons">
                        <label className="emu-file-upload">
                            <input
                                type="file"
                                onChange={e=>{
                                    const fr = new FileReader();
                                    fr.readAsText(e.target.files[0], 'UTF-8');
                                    fr.onload = e => {
                                        dtMemUI8.fill(0);
                                        /*
                                        (e.target.result.replace(/^\/\/.*$/gm, '').match(/[0-9a-fA-F]{2}/g) || []).forEach((hexByteBE,offset)=>{
                                            dtMemUI8[offset] = parseInt(hexByteBE, 16) & 0xFF >>> 0;
                                        });
                                        */
                                        let dtptr = 0;
                                        let dtrmhex = e.target.result.replace(/^\/\/.*$/gm, '').split('\n');

                                        dtrmhex.forEach(line=>{
                                            console.log(line, dtptr);
                                            if (line.startsWith('@')) {
                                                let nptr = parseInt(line.replace('@',''), 16) * 2;
                                                while (dtptr < nptr) {
                                                    dtMemUI8[dtptr++] = 0;
                                                    dtMemUI8[dtptr++] = 0;
                                                }
                                            } else {
                                                let hexBytesBE = line.match(/[0-9a-fA-F]{2}/g);
                                                if (!hexBytesBE)
                                                    return;
                                                dtMemUI8[dtptr++] = parseInt(hexBytesBE[0], 16);
                                                dtMemUI8[dtptr++] = parseInt(hexBytesBE[1], 16);
                                            }
                                        });

                                        setDthexNonce(v=>(v+1));
                                    }
                                }}
                            />
                            {"Load data"}
                        </label>
                        <label className="emu-file-upload">
                            <input
                                type="file"
                                onChange={e=>{
                                    const fr = new FileReader();
                                    fr.readAsText(e.target.files[0], 'UTF-8');
                                    fr.onload = e => {
                                        if (onDisassembly) onDisassembly(scdisasm(e.target.result));
                                    }
                                }}
                            />
                            {"Disassemble"}
                        </label>
                        <button
                            onClick={()=>setScRun(!scRun)}
                        >
                            {scRun ? 'Stop' : 'Run'}
                        </button>
                        <button
                            onClick={()=>setScStep(true)}
                        >
                            Step
                        </button>
                        <button
                            onClick={()=>setResetNonce(n=>(n+1))}
                        >
                            Halt+reset
                        </button>
                    </div>
                    <div className="emu-registers">
                        {scState ? (
                            <div className="emu-registers-code-container">
                                <div className="emu-registers-code-column">
                                    <React.Fragment key="emu-pc">
                                        <code>{`pc: ${hex4b(u16(scState.pc))}  `}</code>
                                    </React.Fragment>
                                    {(()=>{
                                        let r = [];
                                        for (let i = 0; i < 4; i++) {
                                            let rv = scState.r[i];
                                            r.push(
                                                <React.Fragment key={`emu-r${i}`}>
                                                    <code>{`r${i}: ${hex4b(u16(rv))}  `}</code>
                                                </React.Fragment>
                                            )
                                        }
                                        return r;
                                    })()}
                                </div>
                                <div className="emu-registers-code-column">
                                    <React.Fragment key="emu-ir">
                                        <code>{`ir: ${hex4b(u16(scState.ir))}  `}</code>
                                    </React.Fragment>
                                    {(()=>{
                                        let r = [];
                                        for (let i = 4; i < 8; i++) {
                                            let rv = scState.r[i];
                                            r.push(
                                                <React.Fragment key={`emu-r${i}`}>
                                                    <code>{`r${i}: ${hex4b(u16(rv))}  `}</code>
                                                </React.Fragment>
                                            )
                                        }
                                        return r;
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <>
                                {"Not running"}
                                <br />
                                {"< Enter code to assemble"}
                            </>
                        )}
                    </div>
                </div>
                <div className="emu-data-container">
                    <HexEditor
                        columns={0x10}
                        data={dtMemUI8}
                        nonce={dthexNonce}
                        onSetValue={dthexEditHandler}
                        theme={{ hexEditor: oneDarkPro }}
                        inlineStyles={{
                            editor: {
                                fontFamily: "'Fira Code', monospace"
                            }
                        }}
                        ref={hexEditorRef}
                    />
                    <div className="emu-data-info">
                        <div className="mem-goto">
                            <label className="prefixed-textbox">
                                {"Goto: 0x"}
                                <input
                                    type="text"
                                    value={hexEditorGotoVal}
                                    onChange={e=>{
                                        let nVal = parseInt(e.target.value, 16);
                                        if (!isNaN(nVal) && nVal >= 0 && nVal <= 0xFFFF) {
                                            if (hexEditorRef.current) hexEditorRef.current.setSelectionRange(nVal*2, nVal*2+2);
                                            setHexEditorGotoVal(e.target.value);
                                        }
                                        if (e.target.value === '')
                                            setHexEditorGotoVal(e.target.value);
                                    }}
                                />
                                <div className="textbox-bottom" />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}