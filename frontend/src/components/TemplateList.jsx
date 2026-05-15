import React, { useState, useEffect } from 'react'
import mondaySdk from 'monday-sdk-js'
import { toast } from 'react-toastify'
import { Heading, Text } from '@vibe/typography'
import { Flex, Box } from '@vibe/layout'
import { EmptyState, Modal, ModalHeader, Avatar, Tooltip } from '@vibe/core'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import { ClassicEditor, Bold, Italic, Underline, Strikethrough, Font, FontSize, Alignment, List, Link, Table, TableToolbar, Image, ImageUpload, ImageInsert, ImageResize, ImageStyle, ImageToolbar, ImageCaption, ImageBlock, ImageInline, Base64UploadAdapter, Undo, Essentials, Paragraph, BlockQuote, Indent, Heading as CKHeading } from 'ckeditor5'
import 'ckeditor5/ckeditor5.css'
import AppContext from '../utils/AppContext'
import LoginModal from './LoginModal'
import { BASE_API_URL } from '../utils/constants'
import TemplateSkeleton from './TemplateSkeleton'
import EmailRecipientField from './EmailRecipientField'

const Button = ({ children, kind = 'primary', size = 'medium', onClick, style = {}, ...props }) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: size === 'small' ? '6px 12px' : '10px 20px',
    borderRadius: size === 'small' ? '6px' : '8px',
    fontSize: size === 'small' ? '13px' : '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    ...style
  }

  const kindStyles = {
    primary: {
      backgroundColor: 'var(--primary-color, #0073ea)',
      color: 'white'
    },
    secondary: {
      backgroundColor: 'white',
      color: 'var(--text-primary, #1a1a1a)',
      border: '1px solid var(--border-color, #e5e7eb)'
    },
    tertiary: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary, #1a1a1a)'
    }
  }

  return (
    <button
      style={{ ...baseStyle, ...kindStyles[kind] }}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

const monday = mondaySdk()

export default function TemplateList({ boardId, sessionToken }) {
  const { currentUser } = React.useContext(AppContext)
  const [confirmState, setConfirmState] = useState({ open: false, loading: false })
  const editorRef = React.useRef(null)
  const [boardColumns, setBoardColumns] = useState([])
  const [boardAssets, setBoardAssets] = useState([])
  const [sendingNow, setSendingNow] = useState(false)
  const [showRecipients, setShowRecipients] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [toError, setToError] = useState('')
  const [toRecipients, setToRecipients] = useState([])
  const [ccRecipients, setCcRecipients] = useState([])
  const [bccRecipients, setBccRecipients] = useState([])
  const [boardEmails, setBoardEmails] = useState([])
  const [userInfoMap, setUserInfoMap] = useState({})
  // Inject specific fix styles for CKEditor layout
  useEffect(() => {
    const styleId = 'ck-layout-fix-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes spin { to { transform: rotate(360deg) } }
        /* List Fix - Refined */
        .ck-content ul, .ck-content ol {
          list-style-position: outside !important;
          margin-left: 40px !important;
          padding-left: 0 !important;
          margin-bottom: 1.2em !important;
          display: block !important;
        }
        .ck-content li {
          display: list-item !important;
          list-style-type: inherit !important;
          padding-left: 10px !important;
        }
        /* Table & Layout Fix */
        .ck-content table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 1em 0 !important;
        }
        .ck-editor__editable {
          min-height: 450px !important;
          padding: 30px 50px !important;
          line-height: 1.6 !important;
          background: white !important;
        }
        /* Fix for widgets (tables, images) jumping */
        .ck-widget {
          outline: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const accountDropdownRef = React.useRef(null)
  const [showFontDropdown, setShowFontDropdown] = useState(false)
  const fontDropdownRef = React.useRef(null)
  const [selectedFont, setSelectedFont] = useState('Arial')
  const [fontSearchQuery, setFontSearchQuery] = useState('')
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false)
  const fontSizeDropdownRef = React.useRef(null)
  const [selectedFontSize, setSelectedFontSize] = useState('14px')
  const [showLinkDropdown, setShowLinkDropdown] = useState(false)
  const linkDropdownRef = React.useRef(null)
  const [linkData, setLinkData] = useState({ url: '', text: '', trackClicks: true })
  const [showTableDropdown, setShowTableDropdown] = useState(false)
  const tableDropdownRef = React.useRef(null)
  const [tableData, setTableData] = useState({ rows: 3, cols: 3 })
  const [tableMenuConfig, setTableMenuConfig] = useState(null)
  const [columnSearch, setColumnSearch] = useState('')
  const [tableInserter, setTableInserter] = useState(null)
  const [authStatus, setAuthStatus] = useState({ authenticated: false })
  const [formData, setFormData] = useState({ name: 'New template', subject: '', body: '', attachments: [] })
  const [editingTemplateId, setEditingTemplateId] = useState(null)
  const [activeFormats, setActiveFormats] = useState({
    bold: false, italic: false, underline: false, strikethrough: false,
    bulletedList: false, numberedList: false,
    alignment: 'left', fontFamily: 'Arial', link: false
  })

  const updateActiveFormats = (editor) => {
    const getCmd = (name) => editor.commands.get(name)
    const formats = {
      bold: getCmd('bold')?.value || false,
      italic: getCmd('italic')?.value || false,
      underline: getCmd('underline')?.value || false,
      strikethrough: getCmd('strikethrough')?.value || false,
      bulletedList: getCmd('bulletedList')?.value || false,
      numberedList: getCmd('numberedList')?.value || false,
      alignment: getCmd('alignment')?.value || 'left',
      fontFamily: getCmd('fontFamily')?.value || 'Arial',
      fontSize: getCmd('fontSize')?.value || 'default',
      link: !!getCmd('link')?.value
    }
    setActiveFormats(formats)
    setSelectedFont(formats.fontFamily)
    setSelectedFontSize(formats.fontSize === 'default' ? '14px' : formats.fontSize)
  }


  useEffect(() => {
    fetchTemplates()
    fetchAuthStatus()
    fetchBoardColumns()
  }, [boardId])

  const fetchBoardColumns = async () => {
    if (!boardId) {
      setBoardColumns([])
      return
    }
    try {
      const res = await monday.api(`
        query {
          boards(ids: [${boardId}]) {
            columns {
              id
              title
              type
            }
            items_page (limit: 50) {
              items {
                assets {
                  id
                  name
                  file_extension
                  file_size
                  public_url
                }
              }
            }
          }
        }
      `)

      const boardData = res?.data?.boards?.[0]
      const columns = boardData?.columns || []
      console.log(columns)
      setBoardColumns(columns)

      const allAssets = []
      const assetIds = new Set()

      boardData?.items_page?.items?.forEach(item => {
        item.assets?.forEach(asset => {
          if (!assetIds.has(asset.id)) {
            assetIds.add(asset.id)
            allAssets.push(asset)
          }
        })
      })
      setBoardAssets(allAssets)
    } catch (err) {
      console.error('Error fetching board data:', err)
      setBoardColumns([])
    }
  }

  const fetchBoardEmails = async () => {
    if (!boardId) return
    try {
      const res = await monday.api(`
        query {
          boards(ids: [${boardId}]) {
            items_page(limit: 100) {
              items {
                column_values {
                  text
                  value
                  column { type }
                }
              }
            }
          }
        }
      `)
      const items = res?.data?.boards?.[0]?.items_page?.items || []
      const emailSet = new Set()
      for (const item of items) {
        for (const cv of item.column_values) {
          if (cv.column?.type === 'email' && cv.text?.trim()) {
            emailSet.add(cv.text.trim().toLowerCase())
          }
          if ((cv.column?.type === 'people' || cv.column?.type === 'multiple-person') && cv.value) {
            try {
              const parsed = JSON.parse(cv.value)
              const persons = Array.isArray(parsed?.personsOrTeams) ? parsed.personsOrTeams : []
              for (const p of persons) {
                if (p.kind === 'person' && p.email) {
                  emailSet.add(p.email.trim().toLowerCase())
                }
              }
            } catch { }
          }
        }
      }
      setBoardEmails([...emailSet].sort())
    } catch (err) {
      console.error('Error fetching board emails:', err)
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setShowAccountDropdown(false)
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target)) {
        setShowFontDropdown(false)
      }
      if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(event.target)) {
        setShowFontSizeDropdown(false)
      }
      if (linkDropdownRef.current && !linkDropdownRef.current.contains(event.target)) {
        setShowLinkDropdown(false)
      }
      if (tableDropdownRef.current && !tableDropdownRef.current.contains(event.target)) {
        setShowTableDropdown(false)
      }
    }

    if (showAccountDropdown || showFontDropdown || showFontSizeDropdown || showLinkDropdown || showTableDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAccountDropdown, showFontDropdown, showFontSizeDropdown, showLinkDropdown, showTableDropdown])

  useEffect(() => {
    const handleEditorClick = (e) => {
      const handle = e.target.closest('.ck-widget__selection-handle');
      if (handle) {
        const widget = handle.closest('.ck-widget.table');
        if (widget) {
          const rect = handle.getBoundingClientRect();
          setTableMenuConfig({
            top: rect.bottom + 4,
            left: rect.left,
            widget: widget
          });
          return;
        }
      }
      if (tableMenuConfig && !e.target.closest('.custom-table-menu')) {
        setTableMenuConfig(null);
      }
    };

    document.addEventListener('click', handleEditorClick);
    return () => document.removeEventListener('click', handleEditorClick);
  }, [tableMenuConfig]);

  useEffect(() => {
    const throttledMouseMove = (() => {
      let lastCall = 0
      const THROTTLE_DELAY = 16

      return (e) => {
        const now = performance.now()
        if (now - lastCall < THROTTLE_DELAY) return
        lastCall = now

        const table = e.target.closest('.ck-widget.table table')
        if (!table) {
          setTableInserter(prev => {
            if (e.target.closest('.table-inserter')) return prev
            if (prev) {
              if (prev.type === 'row' && Math.abs(e.clientY - prev.top) < 15 && e.clientX >= prev.left - 20 && e.clientX <= prev.left + prev.width) return prev
              if (prev.type === 'col' && Math.abs(e.clientX - prev.left) < 15 && e.clientY >= prev.top - 20 && e.clientY <= prev.top + prev.height) return prev
            }
            return null
          })
          return
        }

        const td = e.target.closest('td, th')
        if (!td) return

        const rect = td.getBoundingClientRect()
        const tableRect = table.getBoundingClientRect()
        const THRESHOLD = 12
        let newInserter = null

        if (Math.abs(e.clientY - rect.bottom) < THRESHOLD) {
          const tr = td.closest('tr')
          const rowIndex = Array.from(table.rows).indexOf(tr) + 1
          newInserter = { type: 'row', top: rect.bottom, left: tableRect.left, width: tableRect.width, height: 2, tableDom: table, index: rowIndex }
        } else if (Math.abs(e.clientY - rect.top) < THRESHOLD) {
          const tr = td.closest('tr')
          const rowIndex = Array.from(table.rows).indexOf(tr)
          newInserter = { type: 'row', top: rect.top, left: tableRect.left, width: tableRect.width, height: 2, tableDom: table, index: rowIndex }
        } else if (Math.abs(e.clientX - rect.right) < THRESHOLD) {
          const colIndex = td.cellIndex + 1
          newInserter = { type: 'col', top: tableRect.top, left: rect.right, width: 2, height: tableRect.height, tableDom: table, index: colIndex }
        } else if (Math.abs(e.clientX - rect.left) < THRESHOLD) {
          const colIndex = td.cellIndex
          newInserter = { type: 'col', top: tableRect.top, left: rect.left, width: 2, height: tableRect.height, tableDom: table, index: colIndex }
        }

        if (newInserter) {
          setTableInserter(prev => {
            if (prev && prev.type === newInserter.type && prev.index === newInserter.index && prev.tableDom === newInserter.tableDom) return prev
            return newInserter
          })
        } else {
          setTableInserter(prev => {
            if (e.target.closest('.table-inserter')) return prev
            return null
          })
        }
      }
    })()

    document.addEventListener('mousemove', throttledMouseMove)
    return () => document.removeEventListener('mousemove', throttledMouseMove)
  }, []);

  const fetchAuthStatus = async () => {
    if (!boardId) return
    try {
      const response = await fetch(
        `${BASE_API_URL}/auth/status?board_id=${boardId}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setAuthStatus(data.data)
      }
    } catch (error) {
      console.error('Error fetching auth status:', error)
    }
  }

  const handleRemoveAccount = async () => {
    if (!boardId) return
    try {
      const response = await fetch(
        `${BASE_API_URL}/auth/remove?board_id=${boardId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          }
        }
      )
      const data = await response.json()
      if (data.success) {
        setAuthStatus({ authenticated: false })
        setShowAccountDropdown(false)
      }
    } catch (error) {
      console.error('Error removing account:', error)
    }
  }

  const fetchTemplates = async () => {
    if (!boardId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await fetch(
        `${BASE_API_URL}/templates?board_id=${boardId}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          }
        }
      )
      const result = await response.json()
      setTemplates(result.data?.templates || [])
      // Fetch user info for template owners
      const templates = result.data?.templates || []
      const userIds = [...new Set(templates.map(t => t.created_user).filter(Boolean))]
      if (userIds.length > 0) {
        fetchUsersInfo(userIds)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsersInfo = async (userIds) => {
    const missingIds = userIds.filter(id => !userInfoMap[id])
    if (missingIds.length === 0) return
    try {
      const res = await monday.api(`
        query {
          users(ids: [${missingIds.join(',')}]) {
            id
            name
            photo_thumb
          }
        }
      `)
      const users = res?.data?.users || []
      const newMap = {}
      users.forEach(u => { newMap[u.id] = u })
      setUserInfoMap(prev => ({ ...prev, ...newMap }))
    } catch (err) {
      console.error('Error fetching users info:', err)
    }
  }

  const handleCreateTemplate = () => {
    setEditingTemplateId(null)
    setFormData({ name: 'New template', subject: '', body: '', attachments: [] })
    setColumnSearch('')
    setToRecipients([])
    setCcRecipients([])
    setBccRecipients([])
    setShowRecipients(false)
    setShowCc(false)
    setShowBcc(false)
    setToError('')
    setShowCreateModal(true)
    fetchBoardEmails()
  }

  const handleEditTemplate = (template) => {
    setEditingTemplateId(template.id)
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      attachments: JSON.parse(template.attachments || '[]')
    })
    setColumnSearch('')
    setToRecipients([])
    setCcRecipients([])
    setBccRecipients([])
    setShowRecipients(false)
    setShowCc(false)
    setShowBcc(false)
    setToError('')
    setShowCreateModal(true)
    fetchBoardEmails()
  }

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      await fetch(
        `${BASE_API_URL}/templates/${templateId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          }
        }
      )
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleSaveTemplate = async () => {
    try {
      const url = editingTemplateId
        ? `${BASE_API_URL}/templates/${editingTemplateId}`
        : `${BASE_API_URL}/templates?board_id=${boardId}`;

      const method = editingTemplateId ? 'PUT' : 'POST';

      // Sanitize attachments: remove large Base64 data for files that already have a URL
      const sanitizedAttachments = (formData.attachments || []).map(att => {
        if (att.url) {
          const { data, ...rest } = att;
          return rest;
        }
        return att;
      });

      const payload = {
        ...formData,
        attachments: sanitizedAttachments,
        ...(editingTemplateId ? {} : { created_user: currentUser?.id })
      };

      const response = await fetch(
        url,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'ngrok-skip-browser-warning': '69420'
          },
          body: JSON.stringify(payload)
        }
      )
      if (response.ok) {
        setShowCreateModal(false)
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }

  const handleSendNow = () => {
    if (toRecipients.length === 0) {
      setToError('Recipient is required')
      setShowRecipients(true)
      return
    }

    setToError('')

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const allEmails = [...toRecipients, ...ccRecipients, ...bccRecipients]
    const invalid = allEmails.find(e => !emailRegex.test(e))
    if (invalid) {
      setToError(`Invalid email: ${invalid}`)
      return
    }

    setConfirmState({ open: true, loading: false })
  }

  const doSendNow = async () => {
    setConfirmState(s => ({ ...s, loading: true }))
    setSendingNow(true)
    try {
      const resp = await fetch(`${BASE_API_URL}/email/send-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board_id: boardId,
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: formData.subject,
          body: formData.body,
          attachments: formData.attachments || [],
        }),
      })
      const data = await resp.json()
      setSendingNow(false)
      setConfirmState({ open: false, loading: false })
      if (data.success) {
        console.log("success");
        toast.success(`Email sent to ${toRecipients.length} recipient${toRecipients.length > 1 ? 's' : ''}`);
      } else {
        console.log("error");
        toast.error(data.data?.results?.[0]?.error || 'Failed to send email')
      }
    } catch (err) {
      setSendingNow(false)
      setConfirmState({ open: false, loading: false })
      toast.error('Failed to send email: ' + err.message)
    }
  }

  const notify = () => toast("Wow so easy!");
  const handleLinkClick = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const linkCmd = editor.commands.get('link');
    const currentUrl = linkCmd?.value || '';

    const selection = editor.model.document.selection;
    let selectedText = '';

    if (!selection.isCollapsed) {
      for (const range of selection.getRanges()) {
        for (const item of range.getItems()) {
          if (item.is('$textProxy') || item.is('textProxy') || item.is('text') || item.is('$text')) {
            selectedText += item.data || '';
          }
        }
      }
    }

    setLinkData({
      url: currentUrl,
      text: selectedText,
      trackClicks: true
    });

    setShowLinkDropdown(!showLinkDropdown);
  };

  const handleInsertLink = () => {
    const editor = editorRef.current;
    if (!editor) return;

    if (!linkData.url) {
      editor.execute('unlink');
    } else {
      let finalUrl = linkData.url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:')) {
        finalUrl = 'https://' + finalUrl;
      }

      if (linkData.text) {
        editor.model.change(writer => {
          const selection = editor.model.document.selection;
          if (!selection.isCollapsed) {
            editor.model.deleteContent(selection);
          }
          const linkedText = writer.createText(linkData.text, { linkHref: finalUrl });
          editor.model.insertContent(linkedText, selection);
        });
      } else {
        editor.execute('link', finalUrl);
      }
    }

    setShowLinkDropdown(false);
    editor.editing.view.focus();
  };

  const handleTableAction = (action) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (action.startsWith('align_')) {
      const value = action.split('_')[1];
      editor.execute('alignment', { value });
    } else if (action === 'delete') {
      const selectedElement = editor.model.document.selection.getSelectedElement();
      if (selectedElement && selectedElement.is('table')) {
        editor.model.change(writer => writer.remove(selectedElement));
      }
    } else if (action === 'duplicate') {
      const selectedElement = editor.model.document.selection.getSelectedElement();
      if (selectedElement && selectedElement.is('table')) {
        editor.model.change(writer => {
          const clone = writer.cloneElement(selectedElement);
          writer.insert(clone, writer.createPositionAfter(selectedElement));
        });
      }
    } else if (action === 'cut') {
      const selectedElement = editor.model.document.selection.getSelectedElement();
      if (selectedElement && selectedElement.is('table')) {
        // Can't reliably copy to native clipboard without selection, so just remove for cut.
        // Ideally use editor.execute('cut') if supported.
        editor.model.change(writer => writer.remove(selectedElement));
      }
    }

    setTableMenuConfig(null);
  };

  const handleInsertTableAction = (inserter) => {
    const editor = editorRef.current;
    if (!editor) return;

    const tableWidget = inserter.tableDom.closest('figure.table');
    if (!tableWidget) return;

    const viewElement = editor.editing.view.domConverter.mapDomToView(tableWidget);
    if (!viewElement) return;
    const modelTable = editor.editing.mapper.toModelElement(viewElement);
    if (!modelTable) return;

    if (inserter.type === 'row') {
      const rows = Array.from(modelTable.getChildren()).filter(c => c.is('element', 'tableRow'));
      const numRows = rows.length;
      let targetRowIndex = inserter.index;
      let command = 'insertTableRowAbove';

      if (targetRowIndex >= numRows) {
        targetRowIndex = numRows - 1;
        command = 'insertTableRowBelow';
      }

      const targetRow = rows[targetRowIndex];
      if (targetRow) {
        const firstCell = targetRow.getChild(0);
        if (firstCell) {
          editor.model.change(writer => {
            writer.setSelection(writer.createPositionAt(firstCell, 0));
          });
          editor.execute(command);
        }
      }
    } else if (inserter.type === 'col') {
      const rows = Array.from(modelTable.getChildren()).filter(c => c.is('element', 'tableRow'));
      if (rows.length > 0) {
        const firstRow = rows[0];
        const numCols = Array.from(firstRow.getChildren()).filter(c => c.is('element', 'tableCell')).length;

        let targetColIndex = inserter.index;
        let command = 'insertTableColumnLeft';
        if (targetColIndex >= numCols) {
          targetColIndex = numCols - 1;
          command = 'insertTableColumnRight';
        }

        const targetCell = Array.from(firstRow.getChildren()).filter(c => c.is('element', 'tableCell'))[targetColIndex];
        if (targetCell) {
          editor.model.change(writer => {
            writer.setSelection(writer.createPositionAt(targetCell, 0));
          });
          editor.execute(command);
        }
      }
    }

    setTableInserter(null);
  };

  return (
    <Box style={{
      padding: '40px 60px',
      maxWidth: '1240px',
      margin: '0 auto',
      minHeight: '100vh',
      width: '100%',
    }}>
      <Box style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f4f7ff 100%)',
        borderRadius: '24px',
        padding: '24px 32px',
        border: '1px solid #eef2f6',
        boxShadow: '0 4px 24px -2px rgba(0, 0, 0, 0.03)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decoration */}
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(0,115,234,0.05) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%'
        }} />

        <Flex style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Heading style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#1a1b23',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.03em',
              marginBottom: 8
            }}>
              Email Templates
            </Heading>
            <Flex style={{ alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: loading ? '#f6b93b' : '#00c875', boxShadow: loading ? '0 0 10px rgba(246,185,59,0.3)' : '0 0 10px rgba(0,200,117,0.3)' }} />
              <Text style={{
                color: '#676879',
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif'
              }}>
                {loading ? 'Fetching your templates...' : `${templates.length} ${templates.length === 1 ? 'template' : 'templates'} ready for your campaigns`}
              </Text>
            </Flex>
          </Box>
          <Button
            kind="primary"
            onClick={handleCreateTemplate}
            style={{
              padding: '14px 18px',
              height: 'auto',
              borderRadius: '14px',
              fontWeight: 700,
              fontSize: '15px',
              boxShadow: '0 8px 20px -4px rgba(0, 115, 234, 0.3)',
              border: 'none'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create Template
          </Button>
        </Flex>
      </Box>

      {!loading && templates.length === 0 ? (
        <Box style={{ marginTop: '40px' }}>
          <EmptyState
            title="No templates yet"
            description="Create your first email template to get started"
            visual={() => (
              <svg width="120" height="120" viewBox="0 0 64 64" fill="none">
                <rect x="8" y="8" width="48" height="48" rx="12" stroke="#eef2f6" strokeWidth="2" fill="#f8f9fb" />
                <path d="M20 24H44M20 32H44M20 40H32" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="48" cy="48" r="10" fill="#0073ea" />
                <path d="M48 44V52M44 48H52" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          />
        </Box>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#676879', fontSize: '13px', fontWeight: 600, width: '18%' }}>NAME</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#676879', fontSize: '13px', fontWeight: 600, width: '18%' }}>SUBJECT</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#676879', fontSize: '13px', fontWeight: 600, width: '15%' }}>CONTENT</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#676879', fontSize: '13px', fontWeight: 600, width: '10%' }}>TYPE</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#676879', fontSize: '13px', fontWeight: 600, width: '10%' }}>OWNER</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: '#676879', fontSize: '13px', fontWeight: 600, width: '15%' }}>CREATED</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', color: '#676879', fontSize: '13px', fontWeight: 600, width: '14%' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TemplateSkeleton rows={5} />
                ) : (
                  templates.map((template) => {
                    const rawText = template.body
                      ?.replace(/<[^>]*>?/gm, ' ')
                      ?.replace(/&nbsp;/g, ' ')
                      ?.replace(/\s+/g, ' ')
                      ?.trim() || '';

                    const strippedBody = rawText.length > 10
                      ? rawText.substring(0, 10) + '...'
                      : rawText;

                    const displayName = template.name?.length > 30
                      ? template.name.substring(0, 30) + '...'
                      : (template.name || 'Untitled');

                    const displaySubject = template.subject?.length > 40
                      ? template.subject.substring(0, 40) + '...'
                      : (template.subject || '-');

                    return (
                      <tr
                        key={template.id}
                        onClick={() => handleEditTemplate(template)}
                        style={{
                          borderBottom: '1px solid #f8f9fa',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px 24px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Text style={{ fontWeight: 600, color: '#1a1b23', fontSize: '14px' }}>{displayName}</Text>
                        </td>
                        <td style={{ padding: '16px 24px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Text style={{ color: '#323338', fontSize: '14px' }}>{displaySubject}</Text>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{
                            color: '#676879',
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                          }}>
                            {strippedBody}
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <Box style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            backgroundColor: '#e8f4fd',
                            borderRadius: '4px',
                            color: '#0073ea',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            Email
                          </Box>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <Tooltip content={userInfoMap[template.created_user]?.name || "Template Owner"}>
                            <Avatar
                              size={Avatar.sizes.SMALL}
                              type={userInfoMap[template.created_user]?.photo_thumb ? Avatar.types.IMG : Avatar.types.ICON}
                              {...(userInfoMap[template.created_user]?.photo_thumb
                                ? { src: userInfoMap[template.created_user].photo_thumb }
                                : {
                                  icon: () => (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                  )
                                }
                              )}
                              backgroundColor={Avatar.colors.DONE_GREEN}
                            />
                          </Tooltip>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <Text style={{ color: '#676879', fontSize: '13px' }}>
                            {new Date(template.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <Flex style={{ justifyContent: 'flex-end', gap: '8px' }}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTemplate(template);
                              }}
                              style={{ padding: '6px', cursor: 'pointer', color: '#676879' }}
                              onMouseOver={(e) => e.currentTarget.style.color = '#0073ea'}
                              onMouseOut={(e) => e.currentTarget.style.color = '#676879'}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id);
                              }}
                              style={{ padding: '6px', cursor: 'pointer', color: '#b2b3bd' }}
                              onMouseOver={(e) => e.currentTarget.style.color = '#e2445c'}
                              onMouseOut={(e) => e.currentTarget.style.color = '#b2b3bd'}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </div>
                          </Flex>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        id="create-template-modal"
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        classNames={{
          modal: 'custom-template-modal',
          content: 'custom-template-content'
        }}
      >
        <style>{`
          .custom-template-modal {
            width: 100% !important;
            height: 100% !important;
            padding: 0 !important;
            max-height: 95vh;
            overflow: hidden !important;
          }
          .custom-template-modal [data-testid="modal-content"] {
            padding: 0 !important;
            height: 100% !important;
            display: flex;
            flex-direction: column;
          }
          .hidden-vibe-header, .custom-template-modal [data-testid="modal-header"] {
            display: none !important;
          }
        `}</style>
        <ModalHeader title="Hidden" className="hidden-vibe-header" />
        <Box style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <Flex style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                fontSize: 20,
                margin: 0,
                fontWeight: 500,
                color: '#323338',
                border: 'none',
                outline: 'none',
                padding: '4px 0',
                backgroundColor: 'transparent',
                width: '300px'
              }}
              placeholder="Enter template name..."
            />
            <Flex style={{ gap: 16, alignItems: 'center' }}>
              <Flex style={{ gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#323338' }}>Create update:</Text>
                <div style={{ width: 36, height: 20, backgroundColor: '#0073ea', borderRadius: 10, position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', right: 2, top: 2 }}></div>
                </div>
              </Flex>
              <Tooltip content={currentUser?.name || "Template owner"}>
                <Avatar
                  size={Avatar.sizes.SMALL}
                  type={currentUser?.photo_thumb ? Avatar.types.IMG : Avatar.types.ICON}
                  {...(currentUser?.photo_thumb
                    ? { src: currentUser.photo_thumb }
                    : {
                      icon: () => (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      )
                    }
                  )}
                  backgroundColor={Avatar.colors.DONE_GREEN}
                />
              </Tooltip>
              <Button kind="tertiary" size="small" style={{ padding: '4px', minWidth: 'auto', color: '#6E7278' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M5 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm6.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm5 1.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>
              </Button>
              <Button kind="tertiary" size="small" style={{ padding: '4px', minWidth: 'auto', color: '#6E7278' }} onClick={() => setShowCreateModal(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </Button>
            </Flex>
          </Flex>

          {/* Main Content Area */}
          <Flex style={{ flex: 1, overflow: 'hidden', alignItems: 'stretch' }}>

            {/* Left Area (Editor) */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* From Row */}
              <Flex style={{ padding: '12px 24px', borderBottom: '1px solid #E5E7EB', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6E7278', width: 50, fontWeight: 500 }}>From</Text>
                <div ref={accountDropdownRef} style={{ position: 'relative' }}>
                  <Flex
                    style={{
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      backgroundColor: (showAccountDropdown || authStatus.authenticated) ? '#D2E4FF' : 'transparent',
                      borderRadius: 4,
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      if (authStatus.authenticated) {
                        setShowAccountDropdown(!showAccountDropdown)
                      } else {
                        setShowLoginModal(true)
                      }
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#323338" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <Text style={{ fontSize: 14, color: '#323338', fontWeight: 400 }}>
                      {authStatus.authenticated ? authStatus.email || 'Connected' : 'Select sender account'}
                    </Text>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#323338"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        marginLeft: 4,
                        transition: 'transform 0.2s ease',
                        transform: (showAccountDropdown || showLoginModal) ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </Flex>

                  {/* Account Dropdown */}
                  {showAccountDropdown && authStatus.authenticated && (
                    <Box style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 8,
                      width: 320,
                      backgroundColor: '#fff',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 1000,
                      padding: '16px 0',
                      border: '1px solid #E5E7EB'
                    }}>
                      <Box style={{ padding: '0 16px 12px' }}>
                        <Text style={{ fontSize: 13, fontWeight: 600, color: '#676879', marginBottom: 12, display: 'block' }}>
                          {authStatus.provider === 'gmail' ? 'Gmail' : 'Microsoft'}
                        </Text>
                        <Flex style={{ alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            backgroundColor: '#D04218',
                            borderRadius: '50%',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 600
                          }}>
                            {authStatus.email ? authStatus.email[0].toUpperCase() : 'U'}
                          </div>
                          <Text style={{ fontSize: 14, color: '#323338', flex: 1 }}>
                            {authStatus.email}
                          </Text>
                          <div
                            style={{ cursor: 'pointer', color: '#676879' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAccount();
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </div>
                        </Flex>
                      </Box>

                      <div style={{ height: 1, backgroundColor: '#E5E7EB', margin: '8px 0' }} />

                      <Box
                        style={{
                          padding: '8px 16px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                        onClick={() => {
                          setShowAccountDropdown(false);
                          setShowLoginModal(true);
                        }}
                      >
                        <Text style={{ fontSize: 14, color: '#323338' }}>Add email account</Text>
                      </Box>
                    </Box>
                  )}
                </div>
                <div
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: showRecipients ? '#0073ea' : '#6E7278', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, transition: 'all 0.15s' }}
                  onClick={() => setShowRecipients(!showRecipients)}
                  title="Add recipients"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                </div>
              </Flex>

              {/* Recipient Rows (To / CC / BCC) — hidden by default, shown on trigger */}
              {showRecipients && (
                <div style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', paddingRight: 0 }}>
                    <EmailRecipientField
                      label="To"
                      recipients={toRecipients}
                      suggestions={boardEmails}
                      onChange={emails => { setToRecipients(emails); if (toError) setToError('') }}
                      error={toError}
                      placeholder="Recipients"
                    />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingRight: 16, flexShrink: 0, width: '7%', height: 44 }}>
                      <span
                        style={{ fontSize: 13, color: '#0073ea', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}
                        onClick={() => setShowCc(!showCc)}
                      >
                        Cc
                      </span>
                      <span
                        style={{ fontSize: 13, color: '#0073ea', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}
                        onClick={() => setShowBcc(!showBcc)}
                      >
                        Bcc
                      </span>
                    </div>
                  </div>
                  {showCc && (
                    <div style={{ borderTop: '1px solid #F0F1F3', padding: '0 24px' }}>
                      <EmailRecipientField
                        label="Cc"
                        recipients={ccRecipients}
                        suggestions={boardEmails}
                        onChange={setCcRecipients}
                        placeholder="Carbon copy"
                      />
                    </div>
                  )}
                  {showBcc && (
                    <div style={{ borderTop: '1px solid #F0F1F3', padding: '0 24px' }}>
                      <EmailRecipientField
                        label="Bcc"
                        recipients={bccRecipients}
                        suggestions={boardEmails}
                        onChange={setBccRecipients}
                        placeholder="Blind carbon copy"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Subject Row */}
              <Flex style={{ padding: '12px 24px', borderBottom: '1px solid #E5E7EB', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 14, color: '#6E7278', width: 50, fontWeight: 500 }}>Subject</Text>
                <input
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#323338', padding: '4px 0', backgroundColor: 'transparent' }}
                  placeholder=""
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
                <div style={{ color: '#6E7278', cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                </div>
              </Flex>

              {/* Formatting Toolbar (Restored Design with Clickable Buttons) */}
              <Flex style={{ padding: '8px 24px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F5F6F7', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <Flex style={{ gap: 4, alignItems: 'center' }}>
                  <div
                    onClick={() => editorRef.current?.execute('undo')}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg>
                  </div>
                  <div
                    onClick={() => editorRef.current?.execute('redo')}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path></svg>
                  </div>
                </Flex>

                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />

                <Flex style={{ gap: 12, alignItems: 'center', color: '#323338', fontSize: 13, cursor: 'pointer' }}>
                  <div style={{ position: 'relative' }} ref={fontDropdownRef}>
                    <Flex
                      style={{ alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, backgroundColor: showFontDropdown ? '#E5E7EB' : 'transparent' }}
                      onClick={() => setShowFontDropdown(!showFontDropdown)}
                      onMouseOver={(e) => { if (!showFontDropdown) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                      onMouseOut={(e) => { if (!showFontDropdown) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <span style={{ fontFamily: selectedFont }}>{selectedFont}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </Flex>

                    {showFontDropdown && (
                      <Box style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        width: 200,
                        backgroundColor: '#fff',
                        borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        border: '1px solid #E5E7EB',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Search"
                            value={fontSearchQuery}
                            onChange={(e) => setFontSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px 6px 28px',
                              borderRadius: 4,
                              border: '1px solid #E5E7EB',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              outline: 'none',
                              color: '#323338'
                            }}
                            autoFocus
                          />
                          <svg style={{ position: 'absolute', left: 8, top: 8, color: '#9CA3AF' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                          {['Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New']
                            .filter(f => f.toLowerCase().includes(fontSearchQuery.toLowerCase()))
                            .map(font => (
                              <div
                                key={font}
                                onClick={() => {
                                  setSelectedFont(font)
                                  setShowFontDropdown(false)
                                  editorRef.current?.execute('fontFamily', { value: font })
                                  editorRef.current?.editing.view.focus()
                                }}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderRadius: 4,
                                  fontFamily: font,
                                  fontSize: 13,
                                  backgroundColor: selectedFont === font ? '#cce4ff' : 'transparent',
                                  color: '#323338',
                                  marginBottom: 2
                                }}
                                onMouseOver={(e) => {
                                  if (selectedFont !== font) e.currentTarget.style.backgroundColor = '#F5F6F7'
                                }}
                                onMouseOut={(e) => {
                                  if (selectedFont !== font) e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                              >
                                {font}
                              </div>
                            ))}
                        </div>
                      </Box>
                    )}
                  </div>
                  <div style={{ position: 'relative' }} ref={fontSizeDropdownRef}>
                    <Flex
                      style={{ alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, backgroundColor: showFontSizeDropdown ? '#E5E7EB' : 'transparent' }}
                      onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                      onMouseOver={(e) => { if (!showFontSizeDropdown) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                      onMouseOut={(e) => { if (!showFontSizeDropdown) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <span>{selectedFontSize === 'default' ? 'Default' : selectedFontSize}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </Flex>

                    {showFontSizeDropdown && (
                      <Box style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        width: 80,
                        backgroundColor: '#fff',
                        borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        border: '1px solid #E5E7EB',
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {['default', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'].map(size => (
                          <div
                            key={size}
                            onClick={() => {
                              setSelectedFontSize(size)
                              setShowFontSizeDropdown(false)
                              if (size === 'default') {
                                editorRef.current?.execute('fontSize')
                              } else {
                                editorRef.current?.execute('fontSize', { value: size })
                              }
                              editorRef.current?.editing.view.focus()
                            }}
                            style={{
                              padding: '6px 12px',
                              cursor: 'pointer',
                              borderRadius: 4,
                              fontSize: 13,
                              backgroundColor: selectedFontSize === size ? '#cce4ff' : 'transparent',
                              color: '#323338',
                            }}
                            onMouseOver={(e) => {
                              if (selectedFontSize !== size) e.currentTarget.style.backgroundColor = '#F5F6F7'
                            }}
                            onMouseOut={(e) => {
                              if (selectedFontSize !== size) e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            {size === 'default' ? 'Default' : size}
                          </div>
                        ))}
                      </Box>
                    )}
                  </div>
                </Flex>

                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />

                <Flex style={{ gap: 4, alignItems: 'center' }}>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('bold'); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4, fontWeight: 700, color: activeFormats.bold ? '#0073ea' : '#323338', backgroundColor: activeFormats.bold ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (!activeFormats.bold) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (!activeFormats.bold) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    B
                  </div>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('italic'); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4, fontStyle: 'italic', fontFamily: 'serif', color: activeFormats.italic ? '#0073ea' : '#323338', backgroundColor: activeFormats.italic ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (!activeFormats.italic) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (!activeFormats.italic) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    I
                  </div>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('underline'); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4, textDecoration: 'underline', color: activeFormats.underline ? '#0073ea' : '#6E7278', backgroundColor: activeFormats.underline ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (!activeFormats.underline) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (!activeFormats.underline) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    U
                  </div>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('strikethrough'); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4, textDecoration: 'line-through', color: activeFormats.strikethrough ? '#0073ea' : '#6E7278', backgroundColor: activeFormats.strikethrough ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (!activeFormats.strikethrough) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (!activeFormats.strikethrough) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    S
                  </div>
                </Flex>

                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />

                <Flex style={{ gap: 4, alignItems: 'center' }}>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('bulletedList'); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', backgroundColor: activeFormats.bulletedList ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (!activeFormats.bulletedList) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (!activeFormats.bulletedList) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeFormats.bulletedList ? '#0073ea' : '#6E7278'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                  </div>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('numberedList'); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', backgroundColor: activeFormats.numberedList ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (!activeFormats.numberedList) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (!activeFormats.numberedList) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeFormats.numberedList ? '#0073ea' : '#6E7278'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
                  </div>
                </Flex>

                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />

                <Flex style={{ gap: 4, alignItems: 'center' }}>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('alignment', { value: 'left' }); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', backgroundColor: activeFormats.alignment === 'left' ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (activeFormats.alignment !== 'left') e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (activeFormats.alignment !== 'left') e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeFormats.alignment === 'left' ? '#0073ea' : '#323338'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
                  </div>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('alignment', { value: 'center' }); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', backgroundColor: activeFormats.alignment === 'center' ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (activeFormats.alignment !== 'center') e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (activeFormats.alignment !== 'center') e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeFormats.alignment === 'center' ? '#0073ea' : '#323338'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>
                  </div>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { editorRef.current?.execute('alignment', { value: 'right' }); editorRef.current?.editing.view.focus(); }}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', backgroundColor: activeFormats.alignment === 'right' ? '#D2E4FF' : 'transparent' }}
                    onMouseOver={(e) => { if (activeFormats.alignment !== 'right') e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                    onMouseOut={(e) => { if (activeFormats.alignment !== 'right') e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeFormats.alignment === 'right' ? '#0073ea' : '#323338'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
                  </div>
                </Flex>

                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />

                <Flex style={{ gap: 4, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }} ref={tableDropdownRef}>
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowTableDropdown(!showTableDropdown)}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', backgroundColor: showTableDropdown ? '#D2E4FF' : 'transparent' }}
                      onMouseOver={(e) => { if (!showTableDropdown) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                      onMouseOut={(e) => { if (!showTableDropdown) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showTableDropdown ? '#0073ea' : '#323338'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                    </div>

                    {showTableDropdown && (
                      <Box style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: 8,
                        width: 280,
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        border: '1px solid #E5E7EB',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        cursor: 'default'
                      }}>
                        <Text style={{ fontSize: 20, fontWeight: 500, color: '#323338', margin: 0, textAlign: 'left' }}>Insert Table</Text>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <Text style={{ fontSize: 13, color: '#323338', textAlign: 'left' }}>Number of rows</Text>
                          <div style={{ position: 'relative' }}>
                            <select
                              value={tableData.rows}
                              onChange={(e) => setTableData({ ...tableData, rows: parseInt(e.target.value) })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #c3c6d4', fontSize: 14, outline: 'none', color: '#323338', appearance: 'none', backgroundColor: '#fff', cursor: 'pointer' }}
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" style={{ transform: 'rotate(180deg)' }}><polyline points="18 15 12 9 6 15"></polyline></svg>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <Text style={{ fontSize: 13, color: '#323338', textAlign: 'left' }}>Number of columns</Text>
                          <div style={{ position: 'relative' }}>
                            <select
                              value={tableData.cols}
                              onChange={(e) => setTableData({ ...tableData, cols: parseInt(e.target.value) })}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #c3c6d4', fontSize: 14, outline: 'none', color: '#323338', appearance: 'none', backgroundColor: '#fff', cursor: 'pointer' }}
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" style={{ transform: 'rotate(180deg)' }}><polyline points="18 15 12 9 6 15"></polyline></svg>
                            </div>
                          </div>
                        </div>

                        <Flex style={{ justifyContent: 'flex-end', marginTop: 8, gap: 12 }}>
                          <Button
                            kind="tertiary"
                            size="small"
                            onClick={() => setShowTableDropdown(false)}
                            style={{ color: '#323338', fontWeight: 400 }}
                          >
                            Cancel
                          </Button>
                          <Button
                            kind="primary"
                            size="small"
                            onClick={() => {
                              editorRef.current?.execute('insertTable', { rows: tableData.rows, columns: tableData.cols });
                              setShowTableDropdown(false);
                              editorRef.current?.editing.view.focus();
                            }}
                          >
                            Insert
                          </Button>
                        </Flex>
                      </Box>
                    )}
                  </div>
                </Flex>

                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />

                <Flex style={{ gap: 4, alignItems: 'center' }}>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.setAttribute('type', 'file');
                      input.setAttribute('multiple', 'true');
                      input.click();

                      input.onchange = async () => {
                        const files = Array.from(input.files);

                        const newAttachments = await Promise.all(files.map(async f => {
                          return new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = () => resolve({
                              id: Math.random().toString(36).substring(7),
                              name: f.name,
                              size: f.size,
                              type: f.type,
                              data: reader.result // base64 string
                            });
                            reader.readAsDataURL(f);
                          });
                        }));

                        setFormData(prev => ({
                          ...prev,
                          attachments: [...(prev.attachments || []), ...newAttachments]
                        }));
                      };
                    }}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                  </div>
                  <div
                    onClick={() => {
                      const input = document.createElement('input');
                      input.setAttribute('type', 'file');
                      input.setAttribute('accept', 'image/*');
                      input.click();

                      input.onchange = () => {
                        const file = input.files[0];
                        if (file && /^image\//.test(file.type)) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const editor = editorRef.current;
                            if (editor) {
                              editor.model.change(writer => {
                                // Move selection to the end of the document
                                writer.setSelection(writer.createPositionAt(editor.model.document.getRoot(), 'end'));
                              });

                              // Insert image
                              editor.execute('insertImage', { source: reader.result });

                              // Create a paragraph after the image to ensure user can type below it
                              editor.model.change(writer => {
                                const endPos = writer.createPositionAt(editor.model.document.getRoot(), 'end');
                                const paragraph = writer.createElement('paragraph');
                                editor.model.insertContent(paragraph, endPos);
                                // Set selection to the new paragraph so user can type immediately
                                writer.setSelection(writer.createPositionAt(paragraph, 0));
                              });

                              setTimeout(() => {
                                editor.execute('imageStyle', { value: 'alignLeft' });
                                editor.editing.view.focus();
                              }, 50);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                    }}
                    style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
                </Flex>

                <div style={{ width: 1, height: 16, backgroundColor: '#E5E7EB' }} />

                <Flex style={{ gap: 12, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }} ref={linkDropdownRef}>
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleLinkClick}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', backgroundColor: activeFormats.link || showLinkDropdown ? '#D2E4FF' : 'transparent' }}
                      onMouseOver={(e) => { if (!activeFormats.link && !showLinkDropdown) e.currentTarget.style.backgroundColor = '#E5E7EB' }}
                      onMouseOut={(e) => { if (!activeFormats.link && !showLinkDropdown) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeFormats.link || showLinkDropdown ? '#0073ea' : '#6E7278'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </div>

                    {showLinkDropdown && (
                      <Box style={{
                        position: 'absolute',
                        top: '100%',
                        left: -100,
                        marginTop: 8,
                        width: 280,
                        backgroundColor: '#fff',
                        borderRadius: 8,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        border: '1px solid #E5E7EB',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        cursor: 'default'
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: 600, color: '#323338', margin: 0, textAlign: 'left' }}>Add link</Text>

                        <Flex style={{ alignItems: 'center', gap: 12 }}>
                          <Text style={{ fontSize: 14, color: '#323338', width: 40, textAlign: 'left' }}>Link</Text>
                          <input
                            type="text"
                            placeholder="Url"
                            value={linkData.url}
                            onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter' && linkData.url) handleInsertLink() }}
                            style={{ flex: 1, padding: '6px 12px', borderRadius: 4, border: '1px solid #c3c6d4', fontSize: 14, outline: 'none', color: '#323338' }}
                            autoFocus
                          />
                        </Flex>

                        <Flex style={{ alignItems: 'center', gap: 12 }}>
                          <Text style={{ fontSize: 14, color: '#323338', width: 40, textAlign: 'left' }}>Text</Text>
                          <input
                            type="text"
                            placeholder="Display text"
                            value={linkData.text}
                            onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter' && linkData.url) handleInsertLink() }}
                            style={{ flex: 1, padding: '6px 12px', borderRadius: 4, border: '1px solid #c3c6d4', fontSize: 14, outline: 'none', color: '#323338' }}
                          />
                        </Flex>

                        <Flex style={{ alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ fontSize: 14, color: '#323338' }}>Track clicks</Text>
                          <div
                            onClick={() => setLinkData({ ...linkData, trackClicks: !linkData.trackClicks })}
                            style={{
                              width: 36, height: 20,
                              backgroundColor: linkData.trackClicks ? '#0073ea' : '#c3c6d4',
                              borderRadius: 10, position: 'relative', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{
                              width: 16, height: 16, backgroundColor: '#fff', borderRadius: '50%',
                              position: 'absolute', top: 2,
                              left: linkData.trackClicks ? 18 : 2,
                              transition: 'all 0.2s'
                            }} />
                          </div>
                        </Flex>

                        <Flex style={{ justifyContent: 'space-between', marginTop: 8 }}>
                          <Button
                            kind="secondary"
                            size="small"
                            onClick={() => setShowLinkDropdown(false)}
                            style={{ width: '48%' }}
                          >
                            Cancel
                          </Button>
                          <Button
                            kind="primary"
                            size="small"
                            disabled={!linkData.url}
                            onClick={handleInsertLink}
                            style={{ width: '48%', opacity: !linkData.url ? 0.5 : 1 }}
                          >
                            Insert
                          </Button>
                        </Flex>
                      </Box>
                    )}
                  </div>
                  <div style={{ padding: '6px', cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                  </div>
                </Flex>
              </Flex>

              {/* CKEditor Area */}
              <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <style>{`
                  .ckeditor-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                  }
                  .ck-editor {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    height: 0; /* Force flex child to respect container height */
                  }
                  .ck-editor__top {
                    display: none !important;
                  }
                  .ck-editor__main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    overflow: hidden;
                  }
                  .ck-editor__editable {
                    flex: 1;
                    overflow-y: auto !important;
                    scrollbar-width: thin;
                    scrollbar-color: #c3c6d4 transparent;
                  }
                  .ck-editor__editable::-webkit-scrollbar {
                    width: 6px;
                  }
                  .ck-editor__editable::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .ck-editor__editable::-webkit-scrollbar-thumb {
                    background-color: #c3c6d4;
                    border-radius: 20px;
                  }
                  .ck-content {
                    min-height: 100% !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 32px !important;
                    box-sizing: border-box;
                  }
                  
                  /* Image Resize Anchor to Bottom Left */
                  .ck-content .image, 
                  .ck-content .image-inline,
                  .ck-content figure.image {
                    float: none !important;
                    margin-left: 0 !important;
                    margin-right: auto !important;
                    transform-origin: bottom left !important;
                    display: block !important;
                    clear: both !important;
                    margin-bottom: 16px !important;
                    margin-top: 16px !important;
                  }
                  
                  .ck-content .image.image-style-side {
                    float: none !important;
                    margin-left: 0 !important;
                    margin-right: auto !important;
                  }
                  
                  .ck-content .table {
                    width: 100%;
                  }
                  .ck-content .table table {
                    width: 100%;
                    border: 1px solid #E5E7EB;
                    border-collapse: collapse;
                    table-layout: fixed;
                  }
                  .ck-content .table table td,
                  .ck-content .table table th {
                    border: 1px solid #E5E7EB;
                    padding: 8px;
                    min-width: 50px;
                  }
                  .ck-editor__editable .ck-widget.table.ck-widget_selected {
                    outline: 1px solid #0073ea !important;
                  }
                  .ck-editor__editable .ck-widget.table .ck-widget__selection-handle {
                    background-color: transparent !important;
                    border: none !important;
                    transform: translateX(-100%);
                    left: -4px !important;
                    top: 0px !important;
                    width: 16px !important;
                    height: 24px !important;
                    opacity: 0;
                    transition: opacity 0.2s;
                    background-image: url("data:image/svg+xml,%3Csvg width='12' height='20' viewBox='0 0 12 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='4' cy='4' r='1.5' fill='%236E7278'/%3E%3Ccircle cx='8' cy='4' r='1.5' fill='%236E7278'/%3E%3Ccircle cx='4' cy='8' r='1.5' fill='%236E7278'/%3E%3Ccircle cx='8' cy='8' r='1.5' fill='%236E7278'/%3E%3Ccircle cx='4' cy='12' r='1.5' fill='%236E7278'/%3E%3Ccircle cx='8' cy='12' r='1.5' fill='%236E7278'/%3E%3Ccircle cx='4' cy='16' r='1.5' fill='%236E7278'/%3E%3Ccircle cx='8' cy='16' r='1.5' fill='%236E7278'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: center;
                  }
                  .ck-editor__editable .ck-widget.table:hover .ck-widget__selection-handle,
                  .ck-editor__editable .ck-widget.table.ck-widget_selected .ck-widget__selection-handle {
                    opacity: 1;
                    background-color: #F5F6F7 !important;
                    border-radius: 4px;
                    border: 1px solid #E5E7EB !important;
                  }
                  .ck-editor__editable .ck-widget.table .ck-widget__selection-handle .ck-icon {
                    display: none !important;
                  }
                `}</style>
                <div className="ckeditor-wrapper">
                  <CKEditor
                    editor={ClassicEditor}
                    data={formData.body}
                    onReady={editor => {
                      editorRef.current = editor;

                      const updateFormats = () => updateActiveFormats(editor);

                      // Listen to selection changes to update toolbar active states
                      editor.model.document.selection.on('change', updateFormats);

                      // Listen to command value changes for precise active states
                      const commandsToTrack = ['bold', 'italic', 'underline', 'strikethrough', 'bulletedList', 'numberedList', 'alignment', 'fontFamily', 'fontSize', 'link'];
                      commandsToTrack.forEach(cmdName => {
                        const cmd = editor.commands.get(cmdName);
                        if (cmd) {
                          cmd.on('change:value', updateFormats);
                        }
                      });

                      // Initial check
                      updateFormats();
                    }}
                    onChange={(event, editor) => {
                      const data = editor.getData();
                      setFormData(prev => ({ ...prev, body: data }));
                    }}
                    config={{
                      licenseKey: 'GPL',
                      plugins: [
                        Essentials, Paragraph, Bold, Italic, Underline, Strikethrough,
                        Font, FontSize, Alignment, List, Link, Table, TableToolbar,
                        Image, ImageUpload, ImageInsert, ImageResize, ImageStyle, ImageToolbar, ImageCaption, ImageBlock, ImageInline, Base64UploadAdapter, Undo, BlockQuote, Indent, CKHeading
                      ],
                      image: {
                        resizeUnit: 'px',
                        resizeOptions: [
                          {
                            name: 'resizeImage:original',
                            value: null,
                            icon: 'original'
                          },
                          {
                            name: 'resizeImage:50',
                            value: '50px',
                            icon: 'medium'
                          },
                          {
                            name: 'resizeImage:75',
                            value: '75px',
                            icon: 'large'
                          }
                        ],
                        toolbar: [
                          'imageStyle:inline',
                          'imageStyle:block',
                          'imageStyle:side',
                          '|',
                          'resizeImage',
                          '|',
                          'toggleImageCaption',
                          'imageTextAlternative'
                        ]
                      },
                      placeholder: 'Write your email content here...',
                      toolbar: [], // Empty toolbar, we use our own
                      fontFamily: {
                        options: [
                          'default',
                          'Arial, Helvetica, sans-serif',
                          'Courier New, Courier, monospace',
                          'Georgia, serif',
                          'Lucida Sans Unicode, Lucida Grande, sans-serif',
                          'Tahoma, Geneva, sans-serif',
                          'Times New Roman, Times, serif',
                          'Trebuchet MS, Helvetica, sans-serif',
                          'Verdana, Geneva, sans-serif'
                        ],
                        supportAllValues: true
                      },
                      fontSize: {
                        options: [
                          '10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'
                        ],
                        supportAllValues: true
                      }
                    }}
                  />
                </div>

                {/* Attachments Display Area */}
                {(formData.attachments && formData.attachments.length > 0) && (
                  <Box style={{ marginTop: 'auto', padding: '12px 24px', borderTop: '1px solid #E5E7EB', backgroundColor: '#F5F6F7', flexShrink: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: 500, color: '#323338', marginBottom: 8 }}>Attachments ({formData.attachments.length})</Text>
                    <Flex style={{ gap: 8, flexWrap: 'wrap' }}>
                      {formData.attachments.map(att => (
                        <Flex key={att.id} style={{
                          alignItems: 'center', gap: 8, padding: '4px 8px',
                          backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 4
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                          <Text style={{ fontSize: 13, color: '#323338', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {att.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#6E7278' }}>
                            ({Math.round(att.size / 1024)} KB)
                          </Text>
                          <div
                            onClick={() => setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== att.id) }))}
                            style={{ cursor: 'pointer', color: '#6E7278', display: 'flex', alignItems: 'center' }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#e2445c'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#6E7278'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </div>
                        </Flex>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right Sidebar */}
            <Box style={{ width: 320, borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>

              <Box style={{ padding: '24px 16px 16px', borderBottom: '1px solid #E5E7EB', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Flex style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, cursor: 'pointer' }}>
                  <Flex style={{ alignItems: 'center', gap: 8 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <Heading style={{ fontSize: 16, margin: 0, fontWeight: 500, color: '#323338' }}>Auto-populated fields</Heading>
                  </Flex>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </Flex>

                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <input
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 13, boxSizing: 'border-box', outline: 'none', color: '#323338' }}
                    placeholder="Search columns..."
                  />
                  <svg style={{ position: 'absolute', left: 10, top: 10, color: '#9CA3AF' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                  <Flex style={{ flexWrap: 'wrap', gap: 8 }}>
                    {[
                      { id: '__item_name__', title: 'Item Name', type: 'system' },
                      { id: '__user_name__', title: 'User Name', type: 'system' },
                      { id: '__board_name__', title: 'Board Name', type: 'system' },
                      { id: '__group_name__', title: 'Group Name', type: 'system' },
                      ...boardColumns.filter((col) => !['file', 'subtasks', 'name'].includes(col.type))
                    ]
                      .filter((col) =>
                        !columnSearch || col.title.toLowerCase().includes(columnSearch.toLowerCase())
                      )
                      .map((col) => (
                        <div
                          key={col.id}
                          onClick={() => {
                            const systemVars = {
                              '__item_name__': 'item_name',
                              '__user_name__': 'user_name',
                              '__board_name__': 'board_name',
                              '__group_name__': 'group_name',
                            };
                            const varName = systemVars[col.id] || col.title.toLowerCase().replace(/\s+/g, '_');
                            if (editorRef.current) {
                              editorRef.current.model.change(writer => {
                                writer.insertText(`{{${varName}}}`, editorRef.current.model.document.selection.getFirstPosition());
                              });
                            } else {
                              setFormData({ ...formData, body: formData.body + `{{${varName}}}` })
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #d0e8ff',
                            borderRadius: 4,
                            fontSize: 13,
                            color: '#0073ea',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#f0f7ff',
                            transition: 'all 0.2s',
                            fontWeight: 500
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#d0e8ff';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0f7ff';
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
                          {col.title}
                        </div>
                      ))}
                  </Flex>
                </div>
              </Box>

              <Box style={{ padding: '16px 16px', flexShrink: 0, maxHeight: 200, overflowY: 'auto', borderTop: '1px solid #E5E7EB' }}>
                <Flex style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, cursor: 'pointer' }}>
                  <Heading style={{ fontSize: 14, margin: 0, fontWeight: 500, color: '#323338' }}>File columns as attachments</Heading>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E7278" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </Flex>
                <Flex style={{ flexWrap: 'wrap', gap: 8 }}>
                  {boardAssets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={async (e) => {
                        const target = e.currentTarget;
                        const originalContent = target.innerHTML;
                        // 1. Pre-add to attachments list (Immediate UI feedback)
                        const placeholderAtt = {
                          id: asset.id,
                          name: asset.name,
                          size: asset.file_size || 0,
                          type: asset.file_extension || 'file',
                          url: asset.public_url,
                          isDownloading: true
                        };

                        setFormData(prev => {
                          const exists = prev.attachments?.some(a => a.id === asset.id);
                          if (exists) return prev;
                          return {
                            ...prev,
                            attachments: [...(prev.attachments || []), placeholderAtt]
                          };
                        });

                        try {
                          // 3. Show loading state on chip
                          target.style.opacity = '0.5';
                          target.innerHTML = `<span>⏳</span> ${asset.name}`;

                          // 4. Fetch and convert to Base64 in background
                          const response = await fetch(asset.public_url);
                          if (!response.ok) throw new Error('Network response was not ok');
                          const blob = await response.blob();

                          const reader = new FileReader();
                          const base64Data = await new Promise((resolve, reject) => {
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                          });

                          // 5. Update the attachment with real data (Using functional update for safety)
                          setFormData(prev => ({
                            ...prev,
                            attachments: (prev.attachments || []).map(a =>
                              a.id === asset.id
                                ? { ...a, data: base64Data, size: blob.size, isDownloading: false }
                                : a
                            )
                          }));
                        } catch (err) {
                          console.error('CORS or Download error:', err);
                          // Keep the link-based attachment if base64 conversion fails due to browser security
                          setFormData(prev => ({
                            ...prev,
                            attachments: (prev.attachments || []).map(a =>
                              a.id === asset.id ? { ...a, isDownloading: false, error: true } : a
                            )
                          }));
                        } finally {
                          target.style.opacity = '1';
                          target.innerHTML = originalContent;
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: 4,
                        fontSize: 13,
                        color: '#6E7278',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#fff',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#0073ea';
                        e.currentTarget.style.color = '#0073ea';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.color = '#6E7278';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                      {asset.name}
                    </div>
                  ))}
                  {boardAssets.length === 0 && (
                    <Text style={{ fontSize: 13, color: '#9699a6', fontStyle: 'italic' }}>No files found on board</Text>
                  )}
                </Flex>
              </Box>
            </Box>
          </Flex>

          {/* Footer */}
          <div style={{ padding: '12px 24px', borderTop: '1px solid #E5E7EB', backgroundColor: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={notify}>Notify!</button>
            <Button kind="secondary" onClick={handleSendNow} disabled={sendingNow} style={{ minWidth: 100, padding: '8px 24px', fontSize: 14 }}>
              {sendingNow ? 'Sending...' : 'Send Now'}
            </Button>
            <Button kind="primary" onClick={handleSaveTemplate} style={{ minWidth: 80, padding: '8px 24px', fontSize: 14 }}>
              Save
            </Button>
          </div>

          {/* Custom Table Menu */}
          {tableMenuConfig && (
            <div
              className="custom-table-menu"
              style={{
                position: 'fixed',
                top: tableMenuConfig.top,
                left: tableMenuConfig.left,
                backgroundColor: '#fff',
                borderRadius: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #E5E7EB',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                width: 180,
                padding: '4px'
              }}
            >
              {[
                { id: 'align_left', label: 'Align left', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg> },
                { id: 'align_center', label: 'Align center', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg> },
                { id: 'align_right', label: 'Align right', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg> },
                { type: 'divider' },
                { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg> },
                { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> },
                { id: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> },
                { type: 'divider' },
                { id: 'delete', label: 'Delete', shortcut: 'Del', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> }
              ].map((item, index) => {
                if (item.type === 'divider') {
                  return <div key={`div-${index}`} style={{ height: 1, backgroundColor: '#E5E7EB', margin: '4px 0' }} />
                }
                return (
                  <div
                    key={item.id}
                    onClick={() => handleTableAction(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', cursor: 'pointer', borderRadius: 4, color: '#323338'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#D2E4FF'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Flex style={{ alignItems: 'center', gap: 8 }}>
                      <div style={{ color: '#6E7278', display: 'flex', alignItems: 'center' }}>{item.icon}</div>
                      <Text style={{ fontSize: 13 }}>{item.label}</Text>
                    </Flex>
                    {item.shortcut && (
                      <Text style={{ fontSize: 11, color: '#6E7278', border: '1px solid #c3c6d4', borderRadius: 2, padding: '0 4px', backgroundColor: '#fff' }}>
                        {item.shortcut}
                      </Text>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Table Row/Col Inserter */}
          {tableInserter && (
            <div
              className="table-inserter"
              style={{
                position: 'fixed',
                top: tableInserter.type === 'row' ? tableInserter.top - 1 : tableInserter.top,
                left: tableInserter.type === 'col' ? tableInserter.left - 1 : tableInserter.left,
                width: tableInserter.type === 'row' ? tableInserter.width : 2,
                height: tableInserter.type === 'col' ? tableInserter.height : 2,
                backgroundColor: '#0073ea',
                zIndex: 9998,
                pointerEvents: 'none'
              }}
            >
              <div
                onClick={() => handleInsertTableAction(tableInserter)}
                style={{
                  position: 'absolute',
                  top: tableInserter.type === 'row' ? -7 : -14,
                  left: tableInserter.type === 'col' ? -7 : -14,
                  width: 16,
                  height: 16,
                  backgroundColor: '#0073ea',
                  color: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  boxShadow: '0 0 0 2px #fff',
                  transition: 'transform 0.1s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </div>
            </div>
          )}
        </Box>
      </Modal>

      <LoginModal
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        boardId={boardId}
        sessionToken={sessionToken}
        onSuccess={() => {
          setShowLoginModal(false)
          fetchAuthStatus()
        }}
      />
      <Modal
        show={confirmState.open}
        onClose={() => setConfirmState({ open: false, loading: false })}
        showCloseButton={false}
        contentWidth={400}
      >
        <ModalHeader title="Send mail" style={{ fontSize: 18 }} />
        <div style={{ padding: '8px 0' }}>
          <Text style={{ fontSize: 16, color: '#1f2024', display: 'block', lineHeight: '20px', marginBottom: 24 }}>
            Are you sure you want to send this mail now?
          </Text>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setConfirmState({ open: false, loading: false })}
              disabled={confirmState.loading}
              style={{
                padding: '6px 20px',
                borderRadius: 6,
                border: '1px solid #d0d1d5',
                background: '#fff',
                cursor: confirmState.loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: '#323338',
                opacity: confirmState.loading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={doSendNow}
              disabled={confirmState.loading}
              style={{
                padding: '6px 20px',
                borderRadius: 6,
                border: 'none',
                background: confirmState.loading ? '#0073ea99' : '#0073ea',
                color: '#fff',
                cursor: confirmState.loading ? 'wait' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {confirmState.loading && (
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="10" />
                </svg>
              )}
              Send
            </button>
          </div>
        </div>
      </Modal>
    </Box>
  )
}
