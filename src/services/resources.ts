import { BaseService } from 'panda-discord';
import { resolve } from 'path';

export class ResourceService extends BaseService {
    private readonly root: string = resolve(resolve(process.cwd(), 'resources'));
    private readonly paths: Map<string, string> = new Map();

    public resolve(path: string): string {
        if (!this.paths[path]) {
            this.paths[path] = resolve(this.root, path);
        }
        return this.paths[path];
    }
}
