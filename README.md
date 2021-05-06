# SCAsm

A hastily-made IDE for the Simple Computer architecture presented in chapter 8 of *Logic and Computer Design Fundamentals (5 ed.)* by M. Morris Mano, Charles R. Kime, and Tom Martin.

[Try out SCAsm](https://nununoisy.github.io/SCAsm/)

## Features

- Assembler with basic symbol resolution/labels and built in macros (currenly only `%SLDI`)
- Editor based on the Monaco Editor with syntax highlighting, code completion, and label tooltips
- Integrated debugger/emulator
- Memory viewer/editor with Verilog `$readmemh` format data importer
- Disassembler with Verilog `$readmemh` format data importer
- Exports raw assembly (after macro and symbol resolution) and assembled hex in Verilog `$readmemh` format

## Assembly Specification

| Mnemonic | Format       | Description             |
|----------|--------------|-------------------------|
| `mova`   | `rd, ra    ` | Register copy           |
| `inc`    | `rd, ra    ` | Increment               |
| `add`    | `rd, ra, rb` | Add                     |
| `sub`    | `rd, ra, rb` | Subtract                |
| `dec`    | `rd, ra    ` | Decrement               |
| `and`    | `rd, ra, rb` | Bitwise AND             |
| `or`     | `rd, ra, rb` | Bitwise OR              |
| `xor`    | `rd, ra, rb` | Bitwise XOR             |
| `not`    | `rd, ra    ` | Invert                  |
| `movb`   | `rd,     rb` | Register copy           |
| `shr`    | `rd,     rb` | Logical shift right     |
| `shl`    | `rd,     rb` | Logical shift left      |
| `ldi`    | `rd,     op` | Register load immediate |
| `adi`    | `rd, ra, op` | Register add immediate  |
| `ld`     | `rd, ra    ` | Memory load             |
| `st`     | `    ra, rb` | Memory store            |
| `brz`    | `    ra, ad` | Branch if zero          |
| `brn`    | `    ra, ad` | Branch if negative      |
| `jmp`    | `    ra    ` | Jump to register        |

- `rd`: Destination register
- `ra`: Operand A register
- `rb`: Operand B register
- `op`: 3 bit immediate operand (0..7)
- `ad`: 6 bit sign extended branch offset (-32..31)