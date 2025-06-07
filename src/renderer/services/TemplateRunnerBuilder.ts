import templateRunnerContent from "../../../TemplateRunner/TEMPLATE_RUNNER.md?raw"

const fs = require("fs")
const path = require("path")

export class TemplateRunnerBuilder {
  /**
   * Get all available template files from TEMPLATE_RUNNER.md
   * @returns Record of filename to content for all template files
   */
  private getAvailableTemplateFiles(): Record<string, string> {
    // Regular expression to match RunnerArtifact sections
    const artifactRegex = /<RunnerArtifact name="([^"]+)">\s*([\s\S]*?)\s*<\/RunnerArtifact>/g;

    let match;
    const extractedFiles: Record<string, string> = {};

    // Extract all artifacts from the template
    while ((match = artifactRegex.exec(templateRunnerContent)) !== null) {
      const fileName = match[1];
      const fileContent = match[2];
      extractedFiles[fileName] = fileContent;
    }

    return extractedFiles;
  }

  /**
   * Get template files that match directory patterns (supports ** glob)
   * @param patterns - Array of patterns like "src/components/**", "lib/**"
   * @returns Array of matching file paths
   */
  getTemplateFilesByPatterns(patterns: string[]): string[] {
    const availableFiles = Object.keys(this.getAvailableTemplateFiles());
    const matchingFiles: string[] = [];

    for (const pattern of patterns) {
      if (pattern.includes("**")) {
        // Handle glob patterns
        const baseDir = pattern.replace("/**", "");
        const matchingPattern = availableFiles.filter(file =>
          file.startsWith(baseDir + "/")
        );
        matchingFiles.push(...matchingPattern);
      } else {
        // Handle exact file paths
        if (availableFiles.includes(pattern)) {
          matchingFiles.push(pattern);
        }
      }
    }

    return [...new Set(matchingFiles)]; // Remove duplicates
  }

  /**
   * Import template files into a specific directory
   * @param targetPath - The path to the target directory
   * @param filePaths - Array of file paths to extract from the template
   */
  async importTemplateFiles(
    targetPath: string,
    filePaths: string[]
  ): Promise<void> {
    try {
      const extractedFiles = this.getAvailableTemplateFiles();

      // Filter and write only the requested files
      for (const filePath of filePaths) {
        if (extractedFiles[filePath]) {
          const fullFilePath = path.join(targetPath, filePath);

          // Ensure directory exists for this file
          const fileDir = path.dirname(fullFilePath);
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }

          // Write file content
          fs.writeFileSync(fullFilePath, extractedFiles[filePath], "utf8");
          console.log(`Imported template file: ${filePath}`);
        } else {
          console.warn(`Template file not found: ${filePath}`);
        }
      }
    } catch (error) {
      console.error("Error importing template files:", error);
      throw error;
    }
  }

    /**
   * Import all template files into a runner directory
   * @param runnerPath - The path to the runner directory
   */
  async importAllTemplateFiles(runnerPath: string): Promise<void> {
    const allFiles = this.listAvailableTemplateFiles();
    await this.importTemplateFiles(runnerPath, allFiles);
    console.log(`Imported ${allFiles.length} template files as foundation`);
  }

  /**
   * List all available template files
   * @returns Array of all available template file paths
   */
  listAvailableTemplateFiles(): string[] {
    return Object.keys(this.getAvailableTemplateFiles());
  }
}

// Export a singleton instance
export const templateRunnerBuilder = new TemplateRunnerBuilder();