'use client'
import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [status, setStatus] = useState('Press the mic and speak your command...')
  const [language, setLanguage] = useState('en')
  const [shoppingList, setShoppingList] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [activeTab, setActiveTab] = useState('list') // 'list', 'suggestions', 'search'

  useEffect(() => {
    refreshShoppingList()
    loadSuggestions()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => {
        setStatus('🎙️ Listening...')
        setListening(true)
      }

      recognition.onend = () => {
        setStatus('⏳ Processing...')
        setListening(false)
      }

      recognition.onerror = (e) => {
        setStatus(`⚠️ Error: ${e.error}`)
        setListening(false)
      }

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim()
        setStatus(`📥 Heard: "${transcript}"`)
        processVoiceCommand(transcript)
      }

      recognitionRef.current = recognition
    } else {
      alert('Speech Recognition not supported. Use Chrome or Edge.')
    }
  }, [])

  const handleMicClick = () => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.lang = language === 'es' ? 'es-ES' : 'en-US'
      recognitionRef.current.start()
    }
  }

  const processVoiceCommand = async (text) => {
    try {
      const res = await fetch('/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: language }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        setStatus(`✅ ${data.message}`)
        if (data.substitute_suggestions) updateSuggestions(data.substitute_suggestions)
        refreshShoppingList()
      } else {
        setStatus('🤔 Trying search instead...')
        searchProducts(text)
      }
    } catch (err) {
      console.error(err)
      setStatus('❌ Failed to process voice command.')
    }
  }

  const searchProducts = async (text) => {
    try {
      const res = await fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: language }),
      })
      const data = await res.json()
      if (data.status === 'success' && data.found_items.length > 0) {
        setSearchResults(data.found_items)
        setStatus(`🔎 Found ${data.found_items.length} result(s).`)
        setActiveTab('search')
      } else {
        setSearchResults([])
        setStatus(`❌ Nothing found for: "${text}"`)
      }
    } catch {
      setStatus('❌ Search failed.')
    }
  }

  const refreshShoppingList = async () => {
    const res = await fetch('/list')
    const items = await res.json()
    setShoppingList(items)
    setActiveTab('list')
  }

  const loadSuggestions = async () => {
    const res = await fetch('/suggestions')
    const data = await res.json()
    setSuggestions([...data.seasonal_suggestions, ...data.frequently_bought])
  }

  const updateSuggestions = (items) => {
    setSuggestions(items)
    setActiveTab('suggestions')
  }

  const deleteItem = async (id) => {
    try {
      const res = await fetch(`/item/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.status === 'success') {
        setStatus(`✅ ${data.message}`)
        refreshShoppingList()
      } else {
        setStatus(`❌ ${data.message}`)
      }
    } catch (err) {
      console.error(err)
      setStatus('❌ Failed to delete item.')
    }
  }

  const addSuggestion = async (item) => {
    try {
      const res = await fetch('/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `add ${item}`, lang: language }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        setStatus(`✅ Added ${item}`)
        refreshShoppingList()
      }
    } catch (err) {
      console.error(err)
      setStatus('❌ Failed to add suggestion.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8 text-gray-800">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">🛍️ Voice Shopping Assistant</h1>
          <p className="text-lg text-gray-600">Speak naturally and let AI manage your shopping list</p>
        </header>

        {/* Voice Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
            <button
              onClick={handleMicClick}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all ${
                listening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {listening ? (
                <>
                  <span className="animate-pulse">🔴</span> Stop Listening
                </>
              ) : (
                <>
                  <span>🎤</span> Start Listening
                </>
              )}
            </button>
          </div>
          <div className="text-center text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
            {status}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('list')}
          >
            📝 Shopping List
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'suggestions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('suggestions')}
          >
            💡 Suggestions
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Search Results
          </button>
        </div>

        {/* Shopping List */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Shopping List</h2>
              {shoppingList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Your list is empty. Try adding items by voice!
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {shoppingList.map((item) => (
                    <li key={item.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.quantity})</span>
                        {item.category && (
                          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                        aria-label="Delete item"
                      >
                        🗑️
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {activeTab === 'suggestions' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Smart Suggestions</h2>
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No suggestions available. Try adding some items first!
                </div>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestions.map((item, idx) => (
                    <li key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <span>{item}</span>
                        <button
                          onClick={() => addSuggestion(item)}
                          className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50 transition-colors"
                          aria-label="Add to list"
                        >
                          ➕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Search Results */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Product Search Results</h2>
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No results found. Try a different search term.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {searchResults.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.brand}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{product.price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => addSuggestion(product.name)}
                              className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50 transition-colors"
                              aria-label="Add to list"
                            >
                              ➕ Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Voice Shopping Assistant - Speak naturally to manage your shopping list</p>
        </footer>
      </div>
    </div>
  )
}