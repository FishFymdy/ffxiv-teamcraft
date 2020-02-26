import { Component } from '@angular/core';
import { IpcService } from '../../../core/electron/ipc.service';
import { ListsFacade } from '../../../modules/list/+state/lists.facade';
import { LayoutsFacade } from '../../../core/layout/+state/layouts.facade';
import { filter, map, shareReplay, switchMap } from 'rxjs/operators';
import { combineLatest, ReplaySubject } from 'rxjs';
import { LayoutRowDisplay } from '../../../core/layout/layout-row-display';

@Component({
  selector: 'app-list-panel-overlay',
  templateUrl: './list-panel-overlay.component.html',
  styleUrls: ['./list-panel-overlay.component.less']
})
export class ListPanelOverlayComponent {

  public display$ = this.listsFacade.selectedList$.pipe(
    switchMap(list => {
      return combineLatest([
        this.layoutsFacade.getDisplay(list, false),
        this.layoutsFacade.getFinalItemsDisplay(list, false)
      ]);
    }),
    map(([display, finalRow]) => ([...display.rows, finalRow])),
    shareReplay(1)
  );

  public selectedPanel$ = new ReplaySubject<string>();

  public selectedPanelDisplay$ = combineLatest([this.display$, this.selectedPanel$]).pipe(
    map(([display, selectedPanel]) => {
      return display.find(row => row.title === selectedPanel);
    })
  );

  constructor(private ipc: IpcService, private listsFacade: ListsFacade,
              private layoutsFacade: LayoutsFacade) {
    this.ipc.mainWindowState$.pipe(
      filter(state => {
        return state.lists && state.lists.selectedId && state.layouts;
      })
    ).subscribe((state) => {
      this.listsFacade.overlayListsLoaded(state.lists.listDetails);
      this.listsFacade.select(state.lists.selectedId);
      this.layoutsFacade.selectFromOverlay(state.layouts.selectedKey);
    });
  }

  trackByPanel(index: number, panel: LayoutRowDisplay): string {
    return panel.title;
  }

}
