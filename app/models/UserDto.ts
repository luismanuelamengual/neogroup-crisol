import { Dto } from '@neogroup/neorm'
import { User } from '@/app/models/User'

/** FE representation of a user — derived from the entity, minus the sensitive fields. */
export type UserDto = Omit<Dto<User>, 'passwordHash'>
