<RunnerArtifact name="src/App.tsx">
import React, { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Terminal, Play, Sparkles } from "lucide-react"
import "./globals.css"

// Import ESM modules regularly
// import foo from 'foolib'

// Import CommonJS modules
// const bar = require('barlib')

// Access Node regularly
// const fs = require('fs')
// const path = require('path')
// const os = require('os')
// const http = require('http')

declare global {
  interface Window {
    registerCleanup: (tabId: string, cleanupFn: () => void) => void
    __RENDER_RUNNER__: (app: React.ComponentType<any>) => void
    api: {
      // Command execution
      executeCommand: (command: string) => Promise<{ success: boolean; output: string; error?: string }>
      executeCommandWithArgs: (executable: string, args?: string[]) => Promise<{ success: boolean; output: string; error?: string }>
      // User preferences
      getRunnerPreference: (runnerId: string, key: string) => any
      updateRunnerPreference: (runnerId: string, key: string, value: any) => boolean
      setRunnerPreferences: (runnerId: string, preferences: Record<string, any>) => boolean
      getRunnerPreferences: (runnerId: string) => Record<string, any>
      removeRunnerPreference: (runnerId: string, key: string) => boolean
    }
  }
}

interface RunnerProps {
  dataDirectory: string
  fileInput?: {
    path: string
    mimetype: string
  }
  tabId: string
}

const styles = {
  container: {
    padding: "20px",
    background: "#0a0a0a",
    color: "#ffffff",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  }
}

const TemplateRunner: React.FC<RunnerProps> = ({
  tabId,
  dataDirectory,
}: RunnerProps) => {
  const [commandOutput, setCommandOutput] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  useEffect(() => {
    window.registerCleanup(tabId, () => {
      // Cleanup timers, listeners, etc.
    })
  }, [tabId])

  const runExampleCommand = async () => {
    setIsLoading(true)
    try {
      const result = await window.api.executeCommand('echo "Hello from Viberunner!"')
      if (result.success) {
        setCommandOutput(result.output)
      } else {
        setCommandOutput(`Error: ${result.error}`)
      }
    } catch (error) {
      setCommandOutput(`Failed to execute: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Sparkles className="w-6 h-6" />
        Viberunner Template
      </div>

      <div className="grid gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Command Execution Example
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              This demonstrates how to execute system commands from your runner.
            </p>
            <Button
              onClick={runExampleCommand}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isLoading ? "Running..." : "Run Example Command"}
            </Button>
            {commandOutput && (
              <Card className="bg-gray-950 border-gray-700">
                <CardContent className="p-4">
                  <pre className="text-sm text-green-400 font-mono">
                    {commandOutput}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-300">
              You have access to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li>Node.js APIs (fs, path, os, http, etc.)</li>
              <li>System command execution via window.api.executeCommand</li>
              <li>Data directory for persistent storage: {dataDirectory}</li>
              <li>shadcn/ui components and Lucide React icons</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

window.__RENDER_RUNNER__(TemplateRunner)

export default TemplateRunner
</RunnerArtifact>

<RunnerArtifact name="package.json">
{
  "name": "viberunner-template-runner",
  "version": "1.0.0",
  "description": "A simple viberunner template runner",
  "main": "dist/bundle.js",
  "viberunner": {
    "name": "Viberunner Template Runner",
    "description": "A simple viberunner template runner",
    "version": "1.0.0",
    "standalone": true,
    "launchMode": "newTab"
  },
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.511.0",
    "@radix-ui/react-slot": "^1.2.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "@tailwindcss/vite": "^4.1.8",
    "tailwind-merge": "^3.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.4",
    "@tailwindcss/postcss": "^4.1.8",
    "@tailwindcss/typography": "^0.5.16",
    "tailwindcss": "^4.1.8"
  }
}

</RunnerArtifact>

<RunnerArtifact name="tsconfig.json">
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
</RunnerArtifact>

<RunnerArtifact name="tsconfig.node.json">
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
</RunnerArtifact>

<RunnerArtifact name="vite.config.mjs">
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': {},
    'global': 'window'
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/App.tsx'),
      name: 'TemplateRunner',
      fileName: 'bundle',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        format: 'iife',
        name: 'TemplateRunner',
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'bundle.css';
          return assetInfo.name;
        }
      }
    },
    cssCodeSplit: false,
    minify: false
  }
});
</RunnerArtifact>

<RunnerArtifact name="src/components/ui/card.tsx">
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-gray-800 bg-gray-900 text-white shadow-lg",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight text-white", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-gray-400", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
</RunnerArtifact>

<RunnerArtifact name="src/components/ui/button.tsx">
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow hover:bg-blue-700",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700",
        outline:
          "border border-gray-700 bg-transparent shadow-sm hover:bg-gray-800 hover:text-white text-gray-300",
        secondary:
          "bg-gray-700 text-white shadow-sm hover:bg-gray-600",
        ghost: "hover:bg-gray-800 hover:text-white text-gray-300",
        link: "text-blue-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
</RunnerArtifact>

<RunnerArtifact name="src/lib/utils.ts">
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
</RunnerArtifact>

<RunnerArtifact name="tailwind.config.js">
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}
</RunnerArtifact>

<RunnerArtifact name="src/globals.css">
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
    --radius: 0.5rem;
  }

  * {
    border-color: hsl(var(--border));
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
</RunnerArtifact>

<RunnerArtifact name="postcss.config.js">
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
</RunnerArtifact>