import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_popup: 'src/popup/index.html',
  },
  devtools_page: 'src/devtools/index.html',
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      js: ['src/content/index.ts'],
      run_at: 'document_end'
    }
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  permissions: ['storage', 'activeTab', 'scripting'],
  web_accessible_resources: [
    {
      resources: ['paper-detection.js', 'build-scene-tree.js'],
      matches: ['<all_urls>']
    }
  ]
})
