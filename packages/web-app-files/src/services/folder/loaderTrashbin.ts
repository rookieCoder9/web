import { FolderLoader, FolderLoaderTask, TaskContext } from '../folder'
import Router from 'vue-router'
import { useTask } from 'vue-concurrency'
import { DavProperties } from 'web-pkg/src/constants'
import { isLocationCommonActive } from '../../router'
import { buildDeletedResource, buildResource } from '../../helpers/resources'
import { Store } from 'vuex'

export class FolderLoaderTrashbin implements FolderLoader {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public isEnabled(store: Store<any>): boolean {
    return true
  }

  public isActive(router: Router): boolean {
    return isLocationCommonActive(router, 'files-common-trash')
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const {
      store,
      clientService: { owncloudSdk: client }
    } = context

    return useTask(function* (signal1, signal2, ref) {
      store.commit('Files/CLEAR_CURRENT_FILES_LIST')

      const resources = yield client.fileTrash.list('', '1', DavProperties.Trashbin)

      store.commit('Files/LOAD_FILES', {
        currentFolder: buildResource(resources[0]),
        files: resources.slice(1).map(buildDeletedResource)
      })

      ref.refreshFileListHeaderPosition()
    })
  }
}
