'use client'
import { useEffect, useRef, useState } from 'react'
import { Mic, StopCircle, Trash2, Plus } from 'lucide-react'

export default function Home() {
  const [status, setStatus] = useState('Press the mic and speak your command...')
  const [language, setLanguage] = useState('en')
  const [shoppingList, setShoppingList] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [activeTab, setActiveTab] = useState('list')

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
      const res = await fetch(process.env.NEXT_PUBLIC_BACK+'/voice-command', {
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
      const res = await fetch(process.env.NEXT_PUBLIC_BACK+'/search', {
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
    const res = await fetch(process.env.NEXT_PUBLIC_BACK+'/list')
    const items = await res.json()
    setShoppingList(items)
    setActiveTab('list')
  }

  const loadSuggestions = async () => {
    const res = await fetch(process.env.NEXT_PUBLIC_BACK+'/suggestions')
    const data = await res.json()
    setSuggestions([...data.seasonal_suggestions, ...data.frequently_bought])
  }

  const updateSuggestions = (items) => {
    setSuggestions(items)
    setActiveTab('suggestions')
  }

  const deleteItem = async (id) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACK}/item/${id}`, {
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
      const res = await fetch(process.env.NEXT_PUBLIC_BACK+'/voice-command', {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10 animate-fade-in">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">
            🛍️ Voice Shopping Assistant
          </h1>
          <p className="text-xl text-gray-600">Your AI-powered shopping companion</p>
        </header>

        {/* Voice Controls */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <select
              className="w-full md:w-1/3 px-5 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-300"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
            <button
              onClick={handleMicClick}
              className={`w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all duration-300 shadow-md ${
                listening ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {listening ? (
                <>
                  <StopCircle className="w-6 h-6 animate-pulse" /> Stop Listening
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" /> Start Listening
                </>
              )}
            </button>
          </div>
          <div className="text-center text-base text-gray-600 p-4 bg-gray-50 rounded-xl shadow-inner">
            {status}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-gray-200 mb-8 space-x-2">
          {['list', 'suggestions', 'search'].map((tab) => (
            <button
              key={tab}
              className={`px-6 py-3 font-semibold text-lg rounded-t-lg transition-all duration-300 ${
                activeTab === tab
                  ? 'text-indigo-600 border-b-4 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'list' && '📝 Shopping List'}
              {tab === 'suggestions' && '💡 Suggestions'}
              {tab === 'search' && '🔍 Search Results'}
            </button>
          ))}
        </div>

        {/* Shopping List */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Shopping List</h2>
              {shoppingList.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-lg">
                  Your list is empty. Try adding items by voice!
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {shoppingList.map((item) => (
                    <li key={item.id} className="py-4 flex justify-between items-center hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800">{item.name}</span>
                        <span className="text-sm text-gray-500">({item.quantity})</span>
                        {item.category && (
                          <span className="px-3 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 font-medium">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-2 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                        aria-label="Delete item"
                      >
                        <Trash2 className="w-5 h-5" />
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
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Smart Suggestions</h2>
              {suggestions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-lg">
                  No suggestions available. Try adding some items first!
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.map((item, idx) => (
                    <li key={idx} className="border border-gray-200 rounded-xl p-4 hover:bg-indigo-50 transition-colors duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">{item}</span>
                        <button
                          onClick={() => addSuggestion(item)}
                          className="p-2 rounded-full text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors duration-200"
                          aria-label="Add to list"
                        >
                          <Plus className="w-5 h-5" />
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
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Product Search Results</h2>
              {searchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-lg">
                  No results found. Try a different search term.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-indigo-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {searchResults.map((product) => (
                        <tr key={product.id} className="hover:bg-indigo-50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.brand}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{product.price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => addSuggestion(product.name)}
                              className="flex items-center gap-2 text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50 transition-colors duration-200"
                              aria-label="Add to list"
                            >
                              <Plus className="w-5 h-5" /> Add
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
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Voice Shopping Assistant - Powered by xAI</p>
        </footer>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}