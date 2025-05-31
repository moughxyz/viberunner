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

// Permission API methods that are added to window.api
export interface PermissionAPI {
  checkDirectoryAccess: (directoryPath: string) => Promise<PermissionCheckResult>;
  requestDirectoryAccess: (directoryPath: string, reason?: string) => Promise<PermissionRequestResult>;
  getGrantedPaths: () => Promise<GrantedPathsResult>;
  readFileSecure: (filePath: string) => Promise<SecureFileReadResult>;
}