import { AppRouter } from "./app/router";
import { InstallPromptEntry } from "./pwa/install";
import { PwaRegistration } from "./pwa/register";

function App() {
  return (
    <>
      <AppRouter />
      <InstallPromptEntry />
      <PwaRegistration />
    </>
  );
}

export default App;
