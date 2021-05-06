import React from 'react';
import ReactDOM from 'react-dom';

import Editor from "@monaco-editor/react";

import Emulator from './components/Emulator';

import monacoLang from './components/monacolang';

import './index.css';

function App() {
    const [asmsource, setAsmsource] = React.useState('');
    const [symboltable, setSymboltable] = React.useState({});
    const [monacoSize, setMonacoSize] = React.useState({w:window.innerWidth/2});
    const [monacoDecorations, setMonacoDecorations] = React.useState([]);
    const lineToAddrMapping = React.useRef([]);
    const [monacoHighlightedLine, setMonacoHighlightedLine] = React.useState(undefined);

    const monacoRef = React.useRef(null);
    const editorRef = React.useRef(null);

    React.useEffect(()=>{
        const windowResizeHandler = () => {
            setMonacoSize({w:window.innerWidth/2});
        };
        window.addEventListener('resize', windowResizeHandler);
        return ()=>window.removeEventListener('resize', windowResizeHandler);
    }, []);

    React.useEffect(()=>{
        if (editorRef.current) {
            let nmdr, nmonacoDecorations;
            if (monacoHighlightedLine) {
                editorRef.current.revealPositionInCenter({ lineNumber: monacoHighlightedLine, column: 1 });
                nmdr = [
                    {
                        range: new monaco.Range(monacoHighlightedLine,1,monacoHighlightedLine,1),
                        options: {
                            isWholeLine: true,
                            className: 'monaco-line-highlight',
                            glyphMarginClassName: 'monaco-glyph-margin'
                        }
                    }
                ];
            } else {
                nmdr = [];
                if (symboltable && Object.keys(symboltable).length > 0) {
                    Object.keys(symboltable).forEach(symbol=>{
                        editorRef.current.getModel().findMatches(new RegExp(`\.${symbol}:?`), false, true, true, true).forEach(match=>{
                            nmdr.push({
                                range: match.range,
                                options: {
                                    isWholeLine: true,
                                    hoverMessage: [{ value: `(label) \`.${symbol}:\` = \`0x${symboltable[symbol].toString(16)}\`` }]
                                }
                            })
                        })
                    })
                }
            }
            nmonacoDecorations = editorRef.current.deltaDecorations(monacoDecorations, nmdr);
            setMonacoDecorations(nmonacoDecorations);
        }
    }, [monacoHighlightedLine, symboltable])

    return (
        <div className="container">
            <div 
                className="monaco-container"
                style={{
                    width: monacoSize.w,
                    left: 0
                }}
            >
                <Editor
                    defaultValue="// enter assembly here"
                    defaultLanguage="scasm"
                    theme="scasm-theme"
                    onChange={v=>setAsmsource(v)}
                    beforeMount={(monaco)=>monacoLang(monaco)}
                    onMount={(editor, monaco)=>{
                        editorRef.current = editor;
                        monacoRef.current = monaco;
                    }}
                    options={{
                        fontFamily: '"Fira Code", monospace',
                        fontLigatures: true,
                        glyphMargin: true,
                        lineNumbers: olinenum => {
                            let addr = lineToAddrMapping.current.indexOf(olinenum);
                            return monacoHighlightedLine ? (addr < 0 ? '' : `$${addr.toString(16)}`) : olinenum;
                        }
                    }}
                />
            </div>
            <div
                className="emulator-container"
                style={{
                    width: monacoSize.w,
                    left: monacoSize.w
                }}
            >
                <Emulator
                    asmsource={asmsource}
                    onShouldHighlightLine={line=>setMonacoHighlightedLine(line)}
                    onLineToAddrMapping={m=>{
                        console.log('ls', lineToAddrMapping);
                        lineToAddrMapping.current=m;
                    }}
                    onSymbolTableChange={setSymboltable}
                    onDisassembly={disasm=>{
                        if (editorRef.current) editorRef.current.getModel().setValue(disasm);
                    }}
                />
            </div>
        </div>
    );
}

ReactDOM.render(
    <App />,
    document.getElementById('container'),
);