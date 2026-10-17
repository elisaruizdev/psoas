export interface TabItem {
  id?: string | undefined;
  label?: string;
  route?: string;
  icon?: string;
}

export type ClinicNotificationType = 'warning' | 'error' | 'success' | 'info';

export interface ClinicNotification {
  message: string;
  icon: string;
  type?: ClinicNotificationType;
  timestamp?: string | Date;
  index?: string;
}

export interface MenuUser {
  name: string;
  email: string;
  avatar?: string;
}

export interface UserMenuItem {
  label: string;
  icon: string;
  path?: string;
  dividerAfter?: boolean;
  action?: () => void;
}
