import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "../header/header";
import { TabMenu } from "../tab-menu/tab-menu";

@Component({
  selector: 'app-private-layout',
  imports: [RouterOutlet, Header, TabMenu],
  templateUrl: './private-layout.html',
  styleUrl: './private-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateLayout {

}
