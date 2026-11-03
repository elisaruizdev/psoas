import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Icon } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'app-login-layout',
  imports: [RouterOutlet, Icon],
  templateUrl: './login-layout.html',
  styleUrl: './login-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginLayout {

}
