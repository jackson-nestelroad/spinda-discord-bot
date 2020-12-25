# Spinda Discord Bot
**Spinda** is a Discord bot that can be used in any server. Primarily, this bot is able to generate a random pattern of the Pokémon Spinda 
from 4,294,967,295 possibilities, matching the behavior of the mainline Pokémon games. However, it comes packaged with several more useful features.

It is implemented using **TypeScript** and the **[Discord.JS](https://discord.js.org/)** library.

## Features
- Fun Commands
  - Spinda generation, Magic 8-Ball, Russian Roulette, Ask the Magic Conch Shell, and more
- Moderation
  - Customizable event logging
- Custom Commands
  - Server-specific, highly-programmable commands

## Custom Commands
Spinda allows server admins to create custom commands for their servers. These commands are just text-replacement commands, so they are great for quickly accessing links and other server-related information. Custom commands are much more accessible, consistent, and flexible than pinning messages, which can often be hard to find or lost altogether.

Furthermore, custom commands allow parameters to be used alongside built-in functions, including branching, random number generation, custom variables, and more. For instance, the following is the code for creating a command that emulates Rock Paper Scissors.

```
>set-command rps {if $1 ~= rock or $1 ~= paper or $1 ~= scissors;{$yours = {capitalize {lowercase $1}}}{$mine = {choose Rock;Paper;Scissors}} You chose **$yours**. I chose **$mine**.
{if $yours = $mine;It's a tie!;You {if $yours = Rock;{if $mine = Paper;lose;win};{if $yours = Paper;{if $mine = Rock;win;lose};{if $yours = Scissors;{if $mine = Rock;lose;win};lose}}}! };Choose `rock`, `paper`, or `scissors`.}
```

Now any member in your server can use `>rps [rock|paper|scissors]` to play!
