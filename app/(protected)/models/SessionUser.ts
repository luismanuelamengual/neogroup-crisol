import { UserDto } from '@/app/models/UserDto'

/** Serializable subset of UserDto — safe to pass server→client and keep in the user store. */
export type SessionUser = Pick<UserDto, 'id' | 'email' | 'name' | 'lastName' | 'nickname' | 'displayName'>
