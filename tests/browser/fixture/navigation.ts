export function usePathname(){const screen=new URLSearchParams(window.location.search).get("buyer");return screen ? screen === "overview" ? "/buyer" : "/buyer/"+screen : window.location.pathname;}

export function useRouter(){return {refresh(){},replace(path:string){window.history.replaceState(null,"",path);},push(path:string){window.history.pushState(null,"",path);}};}
