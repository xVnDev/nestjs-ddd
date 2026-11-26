/**
 * @file Field-level encryption port.
 */
export interface EncryptionService {
  encrypt(value: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

export type EncryptionServicePort = EncryptionService;
