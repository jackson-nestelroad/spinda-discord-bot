import { InstancesClient, ZoneOperationsClient, protos } from '@google-cloud/compute';
import { CommandParameters, SimpleCommand } from 'panda-discord';

import { CommandCategory, CommandPermission, SpindaDiscordBot } from '../../../bot';
import { Environment } from '../../../data/environment';

export class RestartVmCommand extends SimpleCommand<SpindaDiscordBot> {
    public name = 'restart-vm';
    public description = 'Restarts the bot VM, rebuilding the source code and restarting the bot.';
    public category = CommandCategory.Secret;
    public permission = CommandPermission.Owner;

    private isRestarting = false;

    private throwError(message: string): never {
        this.isRestarting = false;
        throw new Error(`Failed to restart VM: ${message}.`);
    }

    public async run({ src }: CommandParameters<SpindaDiscordBot>) {
        if (this.isRestarting) {
            throw new Error(`VM is already restarting.`);
        }

        await src.send('Bot VM is restarting. The bot will be down until the VM comes back up.');

        const instancesClient = new InstancesClient();
        const [response] = await instancesClient.reset({
            project: Environment.GoogleCompute.getProjectId(),
            zone: Environment.GoogleCompute.getZone(),
            instance: Environment.GoogleCompute.getInstanceName(),
        });

        if (response.latestResponse.error) {
            this.throwError(response.latestResponse.error.message);
        }

        // At this point, if the request succeeds, then the VM will reset an the bot will go down.

        if (!response.latestResponse.done) {
            const operationsClient = new ZoneOperationsClient();

            let operation: protos.google.cloud.compute.v1.IOperation;
            do {
                [operation] = await operationsClient.wait({
                    operation: operation.name ?? response.latestResponse.name,
                    project: Environment.GoogleCompute.getProjectId(),
                    zone: Environment.GoogleCompute.getZone(),
                });
            } while (operation.status !== 'DONE');

            if (operation.error) {
                this.throwError(operation.error.errors.map(error => error.message).join('; '));
            }
        }

        // No point in doing anything here, because the bot restarted!
    }
}
