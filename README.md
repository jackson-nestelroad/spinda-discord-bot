# Spinda Discord Bot
**Spinda** is a Discord bot that can be used in any server. Primarily, this bot is able to generate a random pattern of the Pokémon Spinda 
from 4,294,967,296 possibilities, matching the behavior of the mainline Pokémon games. However, it comes packaged with several more useful features.

It is implemented using **TypeScript**, the **[discord.js](https://discord.js.org/)** library, and the **[Panda](https://github.com/jackson-nestelroad/panda-discord)** command framework.

## Features
- Fun Commands
  - Spinda generation, Magic 8-Ball, Russian Roulette, Ask the Magic Conch Shell, and more
- Moderation
  - Customizable event logging
- Custom Commands
  - Server-specific, highly-programmable commands

## Custom Commands
Spinda allows server admins to create custom commands for their servers. These commands are just text-replacement commands, so they are great for quickly accessing links and other server-related information. Custom commands are much more accessible, consistent, and flexible than pinning messages, which can often be hard to find or lost altogether.

Furthermore, custom commands allow parameters to be used alongside built-in functions, including branching, random number generation, custom variables, and more. The sky truly is the limit!

### Examples

#### Rock Paper Scissors (`>rps [rock|paper|scissors]`)
```
>set-command rps {if $1 ~= rock or $1 ~= paper or $1 ~= scissors;{$yours = {capitalize {lowercase $1}}}{$mine = {choose Rock;Paper;Scissors}} You chose **$yours**. I chose **$mine**.
{if $yours = $mine;It's a tie!;You {if $yours = Rock;{if $mine = Paper;lose;win};{if $yours = Paper;{if $mine = Rock;win;lose};{if $yours = Scissors;{if $mine = Rock;lose;win};lose}}}! };Choose `rock`, `paper`, or `scissors`.}
```

#### Fibonacci Numbers (`>fib N`)
```
>set-command fib {if {regex /^\d+$/ $ALL};{$fib := {function {if {math $arg-1 < 2};1;{math {call $fib;{math $arg-1 - 1}} + {call $fib;{math $arg-1 - 2}}}}}}{call $fib;$ALL};{embed Content must be a number}}
```

#### Chain Commands (`>chain >command1 args... >command2 args...`)
```
>set-command chain {$run-all-commands := {function {if {regex /{prefix}(\w+)(?: ((?:(?!{prefix}).)*))?/ $arg-1};{>{$match-group-1} $match-group-2}{call $run-all-commands;{substring $match-end $arg-1}}}}} {call $run-all-commands;$ALL}
```
