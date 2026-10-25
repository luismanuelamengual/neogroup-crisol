/** Payload to create a new player with email/password credentials. */
export interface RegisterInput {
  name: string
  lastName?: string
  email: string
  password: string
}
