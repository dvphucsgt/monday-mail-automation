import React from 'react'

const AppContext = React.createContext({
  context: null,
  currentPage: 'auth',
  setCurrentPage: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {}
})

export default AppContext
