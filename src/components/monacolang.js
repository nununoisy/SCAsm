const opcodes2reg = ['mova','inc','dec','not','movb','shr','shl','ld','st'];
const opcodes3reg = ['add','sub','and','or','xor'];

const opcodes = [
    { op: 'mova', rc: 2, imm: false, addr: false, doc: 'Copy a register'},
    { op: 'inc',  rc: 2, imm: false, addr: false, doc: 'Increment a register'},
    { op: 'add',  rc: 3, imm: false, addr: false, doc: 'Add two registers'},
    { op: 'sub',  rc: 3, imm: false, addr: false, doc: 'Subtract two registers'},
    { op: 'dec',  rc: 2, imm: false, addr: false, doc: 'Decrement a register'},
    { op: 'and',  rc: 3, imm: false, addr: false, doc: 'Bitwise AND two registers'},
    { op: 'or',   rc: 3, imm: false, addr: false, doc: 'Bitwise OR two registers'},
    { op: 'xor',  rc: 3, imm: false, addr: false, doc: 'Bitwise XOR two registers'},
    { op: 'not',  rc: 2, imm: false, addr: false, doc: 'Bitwise NOT a register'},
    { op: 'movb', rc: 2, imm: false, addr: false, doc: 'Copy a register (using ba)'},
    { op: 'shr',  rc: 2, imm: false, addr: false, doc: 'Logical shift right a register'},
    { op: 'shl',  rc: 2, imm: false, addr: false, doc: 'Logical shift left a register'},
    { op: 'ldi',  rc: 1, imm: true,  addr: false, doc: 'Load an immediate value to a register'},
    { op: 'adi',  rc: 2, imm: true,  addr: false, doc: 'Add an immediate value to a register'},
    { op: 'ld',   rc: 2, imm: false, addr: false, doc: 'Load from data memory'},
    { op: 'st',   rc: 2, imm: false, addr: false, doc: 'Store to data memory'},
    { op: 'brz',  rc: 1, imm: false, addr: true,  doc: 'Branch on Zero'},
    { op: 'brn',  rc: 1, imm: false, addr: true,  doc: 'Branch on Negative'},
    { op: 'jmp',  rc: 1, imm: false, addr: false, doc: 'Absolute jump to register'}   
];

export default function monacoLang(monaco) {
    monaco.languages.register({ id: 'scasm' });

    monaco.languages.setMonarchTokensProvider('scasm', {
        tokenizer: {
            root: [
                [/\/\/.*/, 'scasm-comment'],
                [/([Mm][Oo][Vv][AaBb]|[Ii][Nn][Cc]|[Aa][Dd][DdIi]|[Ss][Uu][Bb]|[Dd][Ee][Cc]|[Aa][Nn][Dd]|[Xx]?[Oo][Rr]|[Nn][Oo][Tt]|[Ss][Hh][RrLl]|[Ll][Dd][Ii]?|[Ss][Tt]|[Bb][Rr][ZzNn]|[Jj][Mm][Pp])/, 'scasm-op'],
                [/[Rr][0-7]/i, 'scasm-reg'],
                [/(?<=, *)[0-9]+/, 'scasm-imm'],
                [/\..+(:|$)/, 'scasm-label'],
                [/%(SLDI|PLDI|ISTK|CALL|RET)/, 'scasm-imacro']
            ]
        }
    });

    monaco.editor.defineTheme('scasm-theme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'scasm-comment', foreground: '008800' },
            { token: 'scasm-op',      foreground: 'A31515' },
            { token: 'scasm-reg',     foreground: '008080' },
            { token: 'scasm-imm',     foreground: '0000CC' },
            { token: 'scasm-label',   foreground: '00AACC' },
            { token: 'scasm-imacro',  foreground: 'BA55D3' }     
        ]
    });

    monaco.languages.registerCompletionItemProvider('scasm', {
        provideCompletionItems: () => {
            var suggestions = [
                ...opcodes.map(({op,rc,imm,addr,doc})=>{
                    let args = [];
                    for (let i = 0; i < rc; i++) {
                        args.push(`r$${i}`);
                    }
                    if (imm || addr) {
                        args.push(`$${rc}`)
                    }

                    return {
                        label: op,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: `${op} ${args.join(', ')}`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: doc
                    }
                })
            ];
            return { suggestions: suggestions };
        }
    });
}