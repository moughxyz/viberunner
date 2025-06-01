import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Simple textarea-based editor
const SimpleEditor: React.FC<{
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}> = ({ value, onChange }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="simple-editor"
      spellCheck={false}
      wrap="off"
      style={{
        width: '100%',
        height: '100%',
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        fontSize: '14px',
        border: 'none',
        outline: 'none',
        resize: 'none',
        backgroundColor: 'var(--background-color)',
        color: 'var(--text-color)',
        padding: 'var(--space-2)',
        lineHeight: '1.5'
      }}
    />
  );
};

// Code editor component (using simple editor for now to avoid Monaco CDN issues)
const CodeEditor: React.FC<{
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}> = ({ value, onChange, language }) => {
  return <SimpleEditor value={value} onChange={onChange} language={language} />;
};

interface DotFile {
  name: string;
  path: string;
  content: string;
  exists: boolean;
  size: number;
  lastModified: Date | null;
}

// Common dotfile configurations by OS
const getDotFileConfigs = () => {
  const platform = navigator.platform.toLowerCase();
  const isWindows = platform.includes('win');
  const isMac = platform.includes('mac');

  const homeDir = isWindows ? '%USERPROFILE%' : '~';

  const commonFiles = [
    '.bashrc',
    '.bash_profile',
    '.bash_logout',
    '.zshrc',
    '.zsh_profile',
    '.profile',
    '.vimrc',
    '.gitconfig',
    '.gitignore_global',
    '.npmrc',
    '.yarnrc',
    '.editorconfig',
    '.tmux.conf',
    '.screenrc',
    '.inputrc',
    '.curlrc',
    '.wgetrc',
    '.aliases',
    '.functions',
    '.exports',
    '.path'
  ];

  // Add OS-specific files
  if (isMac) {
    commonFiles.push('.bash_sessions_disable', '.hushlogin');
  }

  if (isWindows) {
    commonFiles.push('.minttyrc', '.condarc');
  }

  return commonFiles.map(file => ({
    name: file,
    path: `${homeDir}/${file}`,
    content: '',
    exists: false,
    size: 0,
    lastModified: null
  }));
};

const App: React.FC = () => {
  const [dotFiles, setDotFiles] = useState<DotFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DotFile | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyExisting, setShowOnlyExisting] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check if a file exists (mock implementation - in real environment this would use file system APIs)
  const checkFileExists = useCallback(async (filePath: string): Promise<boolean> => {
    // In a real implementation, this would check the actual file system
    // For now, we'll simulate some common files existing
    const commonExistingFiles = ['.bashrc', '.gitconfig', '.vimrc', '.zshrc'];
    const fileName = filePath.split('/').pop() || '';
    return commonExistingFiles.includes(fileName);
  }, []);

  // Read file content (mock implementation)
  const readFileContent = useCallback(async (filePath: string): Promise<string> => {
    // In a real implementation, this would read from the actual file system
    // For now, we'll return sample content based on file type
    const fileName = filePath.split('/').pop() || '';

    const sampleContent: Record<string, string> = {
      '.bashrc': `# ~/.bashrc: executed by bash(1) for non-login shells.

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# don't put duplicate lines or lines starting with space in the history.
HISTCONTROL=ignoreboth

# append to the history file, don't overwrite it
shopt -s histappend

# for setting history length see HISTSIZE and HISTFILESIZE in bash(1)
HISTSIZE=1000
HISTFILESIZE=2000

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# enable color support of ls and also add handy aliases
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

# some more ls aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# Add an "alert" alias for long running commands.  Use like so:
#   sleep 10; alert
alias alert='notify-send --urgency=low -i "$([ $? = 0 ] && echo terminal || echo error)" "$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')"'

# enable programmable completion features
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi`,
      '.gitconfig': `[user]
	name = Your Name
	email = your.email@example.com

[core]
	editor = code --wait
	autocrlf = input
	safecrlf = true

[push]
	default = simple

[pull]
	rebase = false

[alias]
	st = status
	co = checkout
	br = branch
	ci = commit
	unstage = reset HEAD --
	last = log -1 HEAD
	visual = !gitk
	lg = log --oneline --graph --decorate --all

[color]
	ui = auto

[diff]
	tool = vscode

[merge]
	tool = vscode

[difftool "vscode"]
	cmd = code --wait --diff $LOCAL $REMOTE

[mergetool "vscode"]
	cmd = code --wait $MERGED`,
      '.vimrc': `" Basic vim configuration

" Enable syntax highlighting
syntax on

" Show line numbers
set number

" Enable mouse support
set mouse=a

" Set tab width
set tabstop=4
set shiftwidth=4
set expandtab

" Enable auto-indentation
set autoindent
set smartindent

" Show matching brackets
set showmatch

" Enable search highlighting
set hlsearch
set incsearch

" Ignore case when searching
set ignorecase
set smartcase

" Enable line wrapping
set wrap
set linebreak

" Show status line
set laststatus=2

" Enable file type detection
filetype on
filetype plugin on
filetype indent on

" Set color scheme
colorscheme desert

" Map common keys
nnoremap <C-s> :w<CR>
inoremap <C-s> <Esc>:w<CR>a`,
      '.zshrc': `# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load
ZSH_THEME="robbyrussell"

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# HYPHEN_INSENSITIVE="true"

# Uncomment the following line to disable bi-weekly auto-update checks.
# DISABLE_AUTO_UPDATE="true"

# Which plugins would you like to load?
plugins=(git node npm yarn docker kubectl)

source $ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias grep='grep --color=auto'

# Add local bin to PATH
export PATH="$HOME/.local/bin:$PATH"`
    };

    return sampleContent[fileName] || `# ${fileName}\n# Configuration file\n`;
  }, []);

  // Initialize dotfiles
  useEffect(() => {
    const initializeDotFiles = async () => {
      setIsLoading(true);
      const configs = getDotFileConfigs();

      const files = await Promise.all(
        configs.map(async (config) => {
          const exists = await checkFileExists(config.path);
          const content = exists ? await readFileContent(config.path) : '';

          return {
            ...config,
            content,
            exists,
            size: content.length,
            lastModified: exists ? new Date() : null
          };
        })
      );

      setDotFiles(files);
      setIsLoading(false);
    };

    initializeDotFiles();
  }, [checkFileExists, readFileContent]);

  // Filter files based on search and existence
  const filteredFiles = dotFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExistence = !showOnlyExisting || file.exists;
    return matchesSearch && matchesExistence;
  });

  // Handle file selection
  const handleFileSelect = (file: DotFile) => {
    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm('You have unsaved changes. Are you sure you want to switch files?');
      if (!confirmSwitch) return;
    }

    setSelectedFile(file);
    setEditorContent(file.content);
    setHasUnsavedChanges(false);
  };

  // Handle editor content change
  const handleEditorChange = (value: string | undefined) => {
    const content = value || '';
    setEditorContent(content);
    setHasUnsavedChanges(selectedFile ? content !== selectedFile.content : false);
  };

  // Save file
  const handleSave = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);

      // In a real implementation, this would write to the file system
      console.log(`Saving ${selectedFile.path}:`, editorContent);

      // Update the file in our state
      const updatedFiles = dotFiles.map(file =>
        file.path === selectedFile.path
          ? { ...file, content: editorContent, exists: true, size: editorContent.length, lastModified: new Date() }
          : file
      );

      setDotFiles(updatedFiles);
      setSelectedFile({ ...selectedFile, content: editorContent, exists: true, size: editorContent.length, lastModified: new Date() });
      setHasUnsavedChanges(false);

      // Show success message
      alert('File saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new file
  const handleCreateFile = () => {
    const fileName = prompt('Enter the dotfile name (e.g., .myconfig):');
    if (!fileName) return;

    const homeDir = navigator.platform.toLowerCase().includes('win') ? '%USERPROFILE%' : '~';
    const newFile: DotFile = {
      name: fileName,
      path: `${homeDir}/${fileName}`,
      content: `# ${fileName}\n# Configuration file\n`,
      exists: false,
      size: 0,
      lastModified: null
    };

    setDotFiles([...dotFiles, newFile]);
    handleFileSelect(newFile);
  };

  // Get language for Monaco editor based on file extension
  const getEditorLanguage = (fileName: string): string => {
    if (fileName.includes('gitconfig') || fileName.includes('.git')) return 'ini';
    if (fileName.includes('json')) return 'json';
    if (fileName.includes('yaml') || fileName.includes('yml')) return 'yaml';
    if (fileName.includes('xml')) return 'xml';
    if (fileName.includes('vim')) return 'vim';
    return 'shell';
  };

  return (
    <div className="dotfile-editor">
      <div className="header">
        <h1>🔧 Dotfile Editor</h1>
        <div className="header-actions">
          <button
            onClick={handleCreateFile}
            className="create-btn"
          >
            + New File
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFile || !hasUnsavedChanges || isLoading}
            className="save-btn"
          >
            💾 Save
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="sidebar">
          <div className="controls">
            <input
              type="text"
              placeholder="Search dotfiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showOnlyExisting}
                onChange={(e) => setShowOnlyExisting(e.target.checked)}
              />
              Show only existing files
            </label>
          </div>

          <div className="file-list">
            <div className="file-count">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
            </div>

            {filteredFiles.map((file) => (
              <div
                key={file.path}
                className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''} ${!file.exists ? 'non-existent' : ''}`}
                onClick={() => handleFileSelect(file)}
              >
                <div className="file-name">
                  {file.exists ? '📄' : '📝'} {file.name}
                  {selectedFile?.path === file.path && hasUnsavedChanges && <span className="unsaved">•</span>}
                </div>
                <div className="file-info">
                  <span className="file-path">{file.path}</span>
                  {file.exists && (
                    <span className="file-size">
                      {file.size} bytes
                      {file.lastModified && ` • ${file.lastModified.toLocaleDateString()}`}
                    </span>
                  )}
                  {!file.exists && <span className="file-status">Not found</span>}
                </div>
              </div>
            ))}

            {filteredFiles.length === 0 && (
              <div className="no-files">
                {searchTerm ? 'No files match your search' : 'No dotfiles found'}
              </div>
            )}
          </div>
        </div>

        <div className="editor-panel">
          {selectedFile ? (
            <div className="editor-container">
              <div className="editor-header">
                <h3>{selectedFile.name}</h3>
                <span className="editor-path">{selectedFile.path}</span>
                {hasUnsavedChanges && <span className="unsaved-indicator">• Unsaved changes</span>}
              </div>

              <div className="editor-wrapper">
                <CodeEditor
                  value={editorContent}
                  onChange={handleEditorChange}
                  language={getEditorLanguage(selectedFile.name)}
                />
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <div className="no-selection-content">
                <h2>Select a dotfile to edit</h2>
                <p>Choose a file from the sidebar to start editing</p>
                <div className="tips">
                  <h3>Tips:</h3>
                  <ul>
                    <li>📄 Files with this icon exist on your system</li>
                    <li>📝 Files with this icon don't exist yet</li>
                    <li>Use the search box to find specific files</li>
                    <li>Create new dotfiles with the "New File" button</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default App;