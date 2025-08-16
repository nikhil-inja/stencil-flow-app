// file: supabase/functions/_shared/crypto.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class Crypto {
  #encryptionKey: Buffer | null = null;
  #supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabase = supabaseClient;
  }

  /**
   * Fetches the encryption key from Supabase Vault and prepares the service.
   * This must be called before using encrypt or decrypt.
   * @param {string} keyId - The UUID of the key in vault.decrypted_secrets.
   */
  async initialize(keyId: string): Promise<void> {
    const { data, error } = await this.#supabase
      .from('vault.decrypted_secrets')
      .select('decrypted_secret')
      .eq('id', keyId)
      .single();

    if (error || !data?.decrypted_secret) {
      throw new Error('Failed to retrieve encryption key from Vault.');
    }

    this.#encryptionKey = Buffer.from(data.decrypted_secret, 'hex');
  }

  /**
   * Encrypts a plaintext string.
   * @param {string} text - The plaintext data to encrypt.
   * @returns {string} - The encrypted string, formatted as "iv:authTag:encryptedData".
   */
  encrypt(text: string): string {
    if (!this.#encryptionKey) {
      throw new Error('Crypto class not initialized. Call initialize() first.');
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.#encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts a string that was encrypted with the encrypt method.
   * @param {string} encryptedText - The "iv:authTag:encryptedData" string.
   * @returns {string} - The original plaintext string.
   */
  decrypt(encryptedText: string): string {
    if (!this.#encryptionKey) {
      throw new Error('Crypto class not initialized. Call initialize() first.');
    }

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format.');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedData = parts[2];

      const decipher = createDecipheriv(ALGORITHM, this.#encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed. Data may be corrupt or tampered with.');
    }
  }
}