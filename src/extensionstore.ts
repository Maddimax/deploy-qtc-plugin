import * as core from '@actions/core'

type Platform = 'Windows' | 'Linux' | 'macOS'
type Architecture = 'x86_64' | 'arm64'

export interface PluginMetaData {
  Id: string
  Name: string
  Version: string
  CompatVersion: string
  Vendor: string
  VendorId: string
  Copyright: string
  License: string
  Category: string
  Description: string
  Url: string
  Tags: string[]
}

interface PlatformDescriptor {
  name: Platform
  architecture: Architecture
}

interface PluginSource {
  url: string
  platform?: PlatformDescriptor
}

interface PluginRequest {
  id: string
  display_name: string
  tags?: string[]
  license: 'open-source' | 'commercial'
  status: 'published' | 'unpublished' | 'disabled'
  icon?: string
  small_icon?: string
  released_at?: string
  is_latest?: boolean
  plugin: {
    metadata: PluginMetaData
    sources: PluginSource[]
  }
}

export interface DownloadUrls {
  winx64?: string
  winarm64?: string
  linuxx64?: string
  linuxarm64?: string
  macosx64?: string
  macosarm64?: string
}

function createPluginRequest(
  pluginMetaData: PluginMetaData,
  publish: boolean,
  downloadUrls: DownloadUrls
): PluginRequest {
  const sources = [
    {
      url: downloadUrls.winx64,
      platform: {
        name: 'Windows',
        architecture: 'x86_64'
      }
    },
    {
      url: downloadUrls.winarm64,
      platform: {
        name: 'Windows',
        architecture: 'arm64'
      }
    },
    {
      url: downloadUrls.linuxx64,
      platform: {
        name: 'Linux',
        architecture: 'x86_64'
      }
    },
    {
      url: downloadUrls.linuxarm64,
      platform: {
        name: 'Linux',
        architecture: 'arm64'
      }
    },
    {
      url: downloadUrls.macosx64,
      platform: {
        name: 'macOS',
        architecture: 'x86_64'
      }
    },
    {
      url: downloadUrls.macosarm64,
      platform: {
        name: 'macOS',
        architecture: 'arm64'
      }
    }
  ].filter(source => source.url) as PluginSource[]

  return {
    id: pluginMetaData.Id,
    display_name: pluginMetaData.Name,
    license: 'open-source',
    status: publish ? 'published' : 'unpublished',
    is_latest: publish,
    tags: pluginMetaData.Tags,
    plugin: {
      metadata: pluginMetaData,
      sources
    }
  }
}

async function request(
  type: 'PUT' | 'POST' | 'GET',
  url: string,
  token: string,
  data?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  core.debug(`Requesting ${url}, method: ${type}, data: ${data}`)
  const response = await fetch(url, {
    method: type,
    headers: {
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: data ? data : undefined
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `HTTP Error: ${[response.status, response.statusText, errorText].filter(s => s).join(', ')}`
    )
  }
  return await response.json()
}

export async function createOrUpdateExtension(
  downloadUrls: DownloadUrls,
  pluginMetaData: PluginMetaData,
  apiUrl: string,
  apiToken: string,
  publish: boolean
): Promise<void> {
  core.debug(`Creating or updating extension ${pluginMetaData.Name}`)

  const pluginRequest = JSON.stringify(
    createPluginRequest(pluginMetaData, publish, downloadUrls)
  )
  const url = new URL('/api/v1/management/plugins', apiUrl)
  await request('POST', url.toString(), apiToken, pluginRequest)
}
