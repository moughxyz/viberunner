// Permission system types for Viberunner apps

export interface PermissionCheckResult {
  success: boolean;
  hasAccess: boolean;
  error?: string;
}

export interface PermissionRequestResult {
  success: boolean;
  granted: boolean;
  error?: string;
}

export interface GrantedPathsResult {
  success: boolean;
  grantedPaths: string[];
  error?: string;
}

export interface SecureFileReadResult {
  success: boolean;
  content?: string; // base64 encoded
  error?: string;
}

export interface SecureFileWriteResult {
  success: boolean;
  error?: string;
}

// Permission API that apps can use
export interface ViberunnerPermissionAPI {
  // Check if we already have access to a directory
  checkDirectoryAccess(directoryPath: string): Promise<PermissionCheckResult>;

  // Request access to a directory with optional reason
  requestDirectoryAccess(directoryPath: string, reason?: string): Promise<PermissionRequestResult>;

  // Get list of all granted directory paths
  getGrantedPaths(): Promise<GrantedPathsResult>;

  // Secure file operations that check permissions first
  readFileSecure(filePath: string): Promise<SecureFileReadResult>;
  writeFileSecure(filePath: string, content: string, encoding?: 'utf8' | 'base64'): Promise<SecureFileWriteResult>;
}