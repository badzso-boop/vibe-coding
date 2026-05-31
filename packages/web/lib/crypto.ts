import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

interface EncryptedPayload {
  iv: string
  encrypted: string
  tag: string
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  const payload: EncryptedPayload = {
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
    tag: tag.toString('hex'),
  }

  return JSON.stringify(payload)
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const { iv, encrypted, tag } = JSON.parse(ciphertext) as EncryptedPayload

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))

  return decipher.update(Buffer.from(encrypted, 'hex')).toString('utf8') + decipher.final('utf8')
}
