import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Input, Space, Popconfirm, Typography, Tag, Modal, Form, Table, App as AntApp } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  SearchOutlined,
  ClearOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import './App.css'

const { Text } = Typography

interface StorageItem {
  key: string
  value: string
}

/** 判断 URL 是否为无法注入脚本的浏览器内置页面 */
function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('https://chrome.google.com')
  )
}

/** 获取当前激活的标签页 */
async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab || null
}

/** 读取页面所有 localStorage */
async function fetchLocalStorage(tabId: number): Promise<StorageItem[]> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const items: Array<{ key: string; value: string }> = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key !== null) {
          items.push({ key, value: localStorage.getItem(key) ?? '' })
        }
      }
      return items
    },
  })
  return (results?.[0]?.result as StorageItem[] | undefined) ?? []
}

/** 设置 localStorage 项 */
async function setStorageItem(tabId: number, key: string, value: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (k: string, v: string) => localStorage.setItem(k, v),
    args: [key, value],
  })
}

/** 删除 localStorage 项 */
async function removeStorageItem(tabId: number, key: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (k: string) => localStorage.removeItem(k),
    args: [key],
  })
}

/** 清空 localStorage */
async function clearStorage(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => localStorage.clear(),
  })
}

export default function App() {
  const { message } = AntApp.useApp()
  const [items, setItems] = useState<StorageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [tabUrl, setTabUrl] = useState('')
  const [supported, setSupported] = useState(true)
  const [form] = Form.useForm()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const tab = await getActiveTab()
      if (!tab?.id) {
        message.error('无法获取当前标签页')
        setSupported(false)
        return
      }
      setTabUrl(tab.url || '')
      if (isRestrictedUrl(tab.url)) {
        setSupported(false)
        setItems([])
        return
      }
      setSupported(true)
      const result = await fetchLocalStorage(tab.id)
      setItems(result)
    } catch (err) {
      setSupported(false)
      setItems([])
      message.error('读取失败：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSave = async (key: string) => {
    try {
      const tab = await getActiveTab()
      if (!tab?.id) return
      await setStorageItem(tab.id, key, editingValue)
      setItems((prev) => prev.map((item) => (item.key === key ? { ...item, value: editingValue } : item)))
      setEditingKey(null)
      message.success('已保存')
    } catch (err) {
      message.error('保存失败：' + (err as Error).message)
    }
  }

  const handleDelete = async (key: string) => {
    try {
      const tab = await getActiveTab()
      if (!tab?.id) return
      await removeStorageItem(tab.id, key)
      setItems((prev) => prev.filter((item) => item.key !== key))
      message.success('已删除')
    } catch (err) {
      message.error('删除失败：' + (err as Error).message)
    }
  }

  const handleClearAll = async () => {
    try {
      const tab = await getActiveTab()
      if (!tab?.id) return
      await clearStorage(tab.id)
      setItems([])
      message.success('已清空')
    } catch (err) {
      message.error('清空失败：' + (err as Error).message)
    }
  }

  const handleAdd = async (values: { key: string; value: string }) => {
    if (items.some((item) => item.key === values.key)) {
      message.error('该 Key 已存在')
      return
    }
    try {
      const tab = await getActiveTab()
      if (!tab?.id) return
      await setStorageItem(tab.id, values.key, values.value)
      setItems((prev) => [...prev, { key: values.key, value: values.value }])
      setAddModalOpen(false)
      form.resetFields()
      message.success('已添加')
    } catch (err) {
      message.error('添加失败：' + (err as Error).message)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制')
    } catch {
      message.error('复制失败')
    }
  }

  const startEdit = (key: string, value: string) => {
    setEditingKey(key)
    setEditingValue(value)
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setEditingValue('')
  }

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.key.toLowerCase().includes(search.toLowerCase()) ||
          item.value.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  )

  const columns: ColumnsType<StorageItem> = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      width: 130,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ fontSize: 12 }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
      render: (text: string, record: StorageItem) => {
        if (editingKey === record.key) {
          return (
            <Input.TextArea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              autoSize={{ minRows: 1, maxRows: 6 }}
              size="small"
            />
          )
        }
        return (
          <Text type="secondary" ellipsis={{ tooltip: text }} style={{ fontSize: 12 }}>
            {text || '(空)'}
          </Text>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: StorageItem) => {
        if (editingKey === record.key) {
          return (
            <Space size="small">
              <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleSave(record.key)}
              />
              <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit} />
            </Space>
          )
        }
        return (
          <Space size="small">
            <Button
              size="small"
              type="text"
              icon={<CopyOutlined />}
              title="复制值"
              onClick={() => handleCopy(record.value)}
            />
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              title="编辑"
              onClick={() => startEdit(record.key, record.value)}
            />
            <Popconfirm
              title="确认删除？"
              okText="确认"
              cancelText="取消"
              onConfirm={() => handleDelete(record.key)}
            >
              <Button size="small" type="text" danger icon={<DeleteOutlined />} title="删除" />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="popup-title">
          <Text strong>LocalStorage</Text>
          {items.length > 0 && <Tag color="blue">{items.length}</Tag>}
        </div>
        <Space size="small">
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            disabled={!supported}
            onClick={() => setAddModalOpen(true)}
          >
            新增
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
            刷新
          </Button>
          {items.length > 0 && (
            <Popconfirm title="确认清空所有数据？" okText="确认" cancelText="取消" onConfirm={handleClearAll}>
              <Button size="small" danger icon={<ClearOutlined />}>
                清空
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {tabUrl && (
        <div className="popup-url">
          <Text type="secondary" ellipsis style={{ fontSize: 11 }}>
            {tabUrl}
          </Text>
        </div>
      )}

      <Input
        placeholder="搜索 Key 或 Value"
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        allowClear
        size="small"
        style={{ marginBottom: 8 }}
      />

      <Table<StorageItem>
        columns={columns}
        dataSource={supported ? filteredItems : []}
        rowKey="key"
        size="small"
        loading={loading}
        pagination={{ pageSize: 50, size: 'small', showTotal: (t) => `共 ${t} 条` }}
        scroll={{ y: 350 }}
        locale={{
          emptyText: !supported
            ? '此页面不支持访问 localStorage'
            : search
              ? '无匹配结果'
              : '暂无数据',
        }}
      />

      <Modal
        title="新增 LocalStorage"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        footer={null}
        width={380}
        destroyOnClose
      >
        <Form form={form} onFinish={handleAdd} layout="vertical">
          <Form.Item name="key" label="Key" rules={[{ required: true, message: '请输入 Key' }]}>
            <Input placeholder="请输入 Key" />
          </Form.Item>
          <Form.Item name="value" label="Value">
            <Input.TextArea placeholder="请输入 Value" autoSize={{ minRows: 2, maxRows: 8 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
              <Button onClick={() => setAddModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
