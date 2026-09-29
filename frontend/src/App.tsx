import { useState } from "react";
import "./App.css";
import { UserForm } from "./components/UserForm";
import { UserSearch } from "./components/UserSearch";
import { UserList } from "./components/UserList";
import type { UserSearchInput } from "./graphql/types";

function App() {
  const [activeFilter, setActiveFilter] = useState<UserSearchInput | null>(null);

  return (
    <div className="app">
      <header>
        <h1>User Directory</h1>
        <p className="subtitle">Frontend → Apollo Router → Subgraph → Java Microservice</p>
      </header>

      <main>
        <UserForm />
        <UserSearch onSearch={setActiveFilter} onClear={() => setActiveFilter(null)} />
        <UserList activeFilter={activeFilter} />
      </main>
    </div>
  );
}

export default App;
