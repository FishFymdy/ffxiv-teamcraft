import { Component } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { FormControl, Validators } from '@angular/forms';
import { CharacterSearchResult, CharacterSearchResultRow, XivapiService } from '@xivapi/angular-client';
import { NzModalRef } from 'ng-zorro-antd';
import { debounceTime, map, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';
import { UserService } from '../../../core/database/user.service';

@Component({
  selector: 'app-user-picker',
  templateUrl: './user-picker.component.html',
  styleUrls: ['./user-picker.component.less']
})
export class UserPickerComponent {

  public servers$: Observable<string[]>;

  public autoCompleteRows$: Observable<string[]>;

  public selectedServer = new FormControl('', [Validators.required]);

  public characterName = new FormControl('');

  public lodestoneId = new FormControl(null);

  public result$: Observable<CharacterSearchResultRow[]>;

  public loadingResults = false;

  constructor(private xivapi: XivapiService, private modalRef: NzModalRef,
              private userService: UserService) {
    this.servers$ = this.xivapi.getServerList().pipe(shareReplay(1));

    this.autoCompleteRows$ = combineLatest(this.servers$, this.selectedServer.valueChanges)
      .pipe(
        map(([servers, inputValue]) => {
          return servers.filter(server => server.indexOf(inputValue) > -1);
        })
      );

    this.result$ = combineLatest(this.selectedServer.valueChanges, this.characterName.valueChanges)
      .pipe(
        tap(() => this.loadingResults = true),
        debounceTime(500),
        switchMap(([selectedServer, characterName]) => {
          return this.xivapi.searchCharacter(characterName, selectedServer);
        }),
        map((result: CharacterSearchResult) => result.Results || []),
        switchMap(results => {
          return combineLatest(
            results.map(c => {
              return this.userService.getUsersByLodestoneId(c.ID)
                .pipe(
                  map(users => {
                    return users.map(user => {
                      return {
                        userId: user.$key,
                        characterName: c.Name,
                        characterAvatar: c.Avatar
                      };
                    });
                  })
                );
            })
          ).pipe(map(res => [].concat.apply([], ...res)));
        }),
        tap(() => this.loadingResults = false)
      );
  }

  pickUser(row: any): void {
    this.modalRef.close(row.userId);
  }

}
