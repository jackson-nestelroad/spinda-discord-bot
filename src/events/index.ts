import { DefaultReadyEvent, EventTypeArray } from 'panda-discord';

import { GuildBanAddEvent } from './guild-ban-add';
import { GuildBanRemoveEvent } from './guild-ban-remove';
import { GuildMemberAddEvent } from './guild-member-add';
import { GuildMemberRemoveEvent } from './guild-member-remove';
import { GuildMemberUpdateEvent } from './guild-member-update';
import { MessageCreateEvent } from './message-create';
import { MessageDeleteEvent } from './message-delete';
import { MessageDeleteBulkEvent } from './message-delete-bulk';
import { MessageUpdateEvent } from './message-update';

export const EventTypes: EventTypeArray = [
    DefaultReadyEvent,

    MessageCreateEvent,

    GuildBanAddEvent,
    GuildBanRemoveEvent,
    GuildMemberAddEvent,
    GuildMemberRemoveEvent,
    GuildMemberUpdateEvent,

    MessageDeleteBulkEvent,
    MessageDeleteEvent,
    MessageUpdateEvent,
];
