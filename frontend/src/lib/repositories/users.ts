import { STORAGE_KEYS } from '@/lib/storage';
import { ID, NewUser, Role, Scope, User } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export interface UserFilter {
  role?: Role;
  search?: string;
  status?: User['status'];
}

export async function listUsers(scope: Scope, filter?: UserFilter): Promise<User[]> {
  return listCollection<User>(STORAGE_KEYS.USERS, scope, (user) => {
    if (filter?.role && user.role !== filter.role) return false;
    if (filter?.status && user.status !== filter.status) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        Boolean(user.phone?.includes(q))
      );
    }
    return true;
  });
}

export async function getUser(id: ID): Promise<User | null> {
  return getCollectionItem<User>(STORAGE_KEYS.USERS, id);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await listCollection<User>(STORAGE_KEYS.USERS, undefined, (u) =>
    u.email.toLowerCase() === email.toLowerCase()
  );
  return users[0] ?? null;
}

export async function createUser(input: NewUser): Promise<User> {
  return createCollectionItem<User>(STORAGE_KEYS.USERS, input, 'usr');
}

export async function updateUser(id: ID, patch: Partial<User>): Promise<User> {
  return updateCollectionItem<User>(STORAGE_KEYS.USERS, id, patch);
}

export async function deleteUser(id: ID): Promise<void> {
  return deleteCollectionItem<User>(STORAGE_KEYS.USERS, id);
}
