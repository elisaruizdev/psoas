import { Injectable } from '@angular/core';
import { AuthSession } from '../models/session.model';

const TOKEN_KEY = 'token';
const ID_PHYSIO_KEY = 'id_physio';
const NAME_KEY = 'name';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  save(session: AuthSession): void {
    sessionStorage.setItem(TOKEN_KEY, session.token);
    sessionStorage.setItem(ID_PHYSIO_KEY, session.idPhysio);
    sessionStorage.setItem(NAME_KEY, session.name);
  }

  token(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  idPhysio(): string | null {
    return sessionStorage.getItem(ID_PHYSIO_KEY);
  }

  name(): string | null {
    return sessionStorage.getItem(NAME_KEY);
  }

  clear(): void {
    sessionStorage.clear();
  }
}
