// Class-based Question Pool & Rotation Utility for Compution Platform Mini Games

export const getUserDifficulty = (user) => {
  if (!user) return 'moderate';
  
  const isComputerCourse = user.course && user.course !== 'Not specified' && user.course !== '';
  if (isComputerCourse) {
    return 'industry';
  }

  const category = String(user.classCategory || '').trim();
  if (['2', '3', '4', '5'].includes(category)) return 'moderate';
  if (['6', '7', '8'].includes(category)) return 'intermediate';
  if (['9', '10'].includes(category)) return 'challenging';
  if (['11', '12'].includes(category)) return 'advanced';

  return 'moderate';
};

// --- Question Pools ---

const QUIZ_POOLS = {
  prog_logic: {
    moderate: [
      { q: "If a robot moves forward 3 steps, turns right, and moves forward 3 steps, what shape did it start tracing?", options: ["A straight line", "A corner of a square", "A circle", "A triangle"], a: "A corner of a square" },
      { q: "You want a loop to repeat until you have drawn all 4 sides of a square. How many times should it repeat?", options: ["2 times", "3 times", "4 times", "5 times"], a: "4 times" },
      { q: "Which of these is a set of step-by-step instructions to solve a problem?", options: ["An algorithm", "A variable", "A database", "A compiler"], a: "An algorithm" },
      { q: "If lightSwitch = True, and we perform: lightSwitch = NOT lightSwitch, what is the new value?", options: ["True", "False", "None", "Error"], a: "False" },
      { q: "Which symbol is commonly used in scratch or block coding to start a program?", options: ["A red stop sign", "A green flag", "A blue arrow", "A yellow star"], a: "A green flag" }
    ],
    intermediate: [
      { q: "Variable X starts at 10. We loop 5 times: in each loop we subtract 2 from X. What is X's final value?", options: ["0", "5", "8", "10"], a: "0" },
      { q: "If X = 5 and Y = 10, what does the condition (X > 3 AND Y < 15) evaluate to?", options: ["True", "False", "Undefined", "Null"], a: "True" },
      { q: "A list contains [2, 4, 6, 8, 10]. If we search for '7' using a binary search, which list element is checked first?", options: ["2", "6", "8", "10"], a: "6" },
      { q: "What is the primary function of a 'variable' in programming?", options: ["To speed up the computer", "To store data that can change", "To translate code to machine language", "To connect to the internet"], a: "To store data that can change" },
      { q: "In Python, which keyword is used to start a function definition?", options: ["function", "def", "func", "define"], a: "def" }
    ],
    challenging: [
      { q: "A stack is a LIFO (Last In First Out) structure. We push A, push B, pop, push C, pop. What is left?", options: ["A", "B", "C", "Empty"], a: "A" },
      { q: "What is the worst-case time complexity of searching for an element in an unsorted array of size N?", options: ["O(1)", "O(log N)", "O(N)", "O(N^2)"], a: "O(N)" },
      { q: "In JavaScript, what is the output of: console.log(typeof [])?", options: ["array", "object", "undefined", "list"], a: "object" },
      { q: "Which sorting algorithm operates by repeatedly picking the smallest element and swapping it?", options: ["Bubble Sort", "Quick Sort", "Selection Sort", "Merge Sort"], a: "Selection Sort" },
      { q: "If a recursive function does not have a base case, what error will typically occur?", options: ["Syntax Error", "Stack Overflow", "Type Error", "Division by Zero"], a: "Stack Overflow" }
    ],
    advanced: [
      { q: "What is the average-case time complexity of Quick Sort?", options: ["O(N)", "O(N log N)", "O(N^2)", "O(log N)"], a: "O(N log N)" },
      { q: "In OOP, what is it called when a subclass provides a specific implementation of a method already defined in its superclass?", options: ["Method Overloading", "Method Overriding", "Polymorphism", "Encapsulation"], a: "Method Overriding" },
      { q: "Which data structure is best suited for implementing a Breadth-First Search (BFS) on a graph?", options: ["Stack", "Queue", "Binary Search Tree", "Linked List"], a: "Queue" },
      { q: "What does the 'volatile' keyword signify in Java/C++?", options: ["The variable value cannot be modified", "The variable may be modified asynchronously by multiple threads", "The variable is stored in the cache memory", "The variable has a dynamic data type"], a: "The variable may be modified asynchronously by multiple threads" },
      { q: "In Python, what is the time complexity of appending an element to a list?", options: ["O(1) amortized", "O(N)", "O(log N)", "O(N log N)"], a: "O(1) amortized" }
    ],
    industry: [
      { q: "Which JavaScript engine runs inside Google Chrome and compiles JS directly to native machine code?", options: ["Chakra", "SpiderMonkey", "V8", "JavaScriptCore"], a: "V8" },
      { q: "In database design, which normal form (NF) requires removing transitive dependencies?", options: ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"], a: "Third Normal Form (3NF)" },
      { q: "What is the primary objective of a reverse proxy like Nginx?", options: ["To compile frontend Javascript code", "To route incoming traffic to backend web servers and load balance", "To act as an offline cache for IndexedDB", "To securely sign JWT authentication tokens"], a: "To route incoming traffic to backend web servers and load balance" },
      { q: "Which HTTP status code represents a resource that has been permanently moved to a new URI?", options: ["301", "302", "307", "308"], a: "301" },
      { q: "In React, what hook should be used to memoize the computed value of an expensive calculation?", options: ["useCallback", "useMemo", "useEffect", "useRef"], a: "useMemo" }
    ]
  },
  comp_fund: {
    moderate: [
      { q: "Which of these is the physical brain of the computer?", options: ["Monitor", "CPU", "Keyboard", "Mouse"], a: "CPU" },
      { q: "What does the power button on a computer do?", options: ["Saves your files", "Turns the computer on or off", "Connects to Wi-Fi", "Cleans the keyboard"], a: "Turns the computer on or off" },
      { q: "Which device is used to type letters and numbers on the screen?", options: ["Mouse", "Printer", "Keyboard", "Scanner"], a: "Keyboard" },
      { q: "What happens to files when you put them in the Recycle Bin?", options: ["They are deleted permanently immediately", "They are moved to a temporary holding area before deletion", "They are emailed to your teacher", "They are compressed to save space"], a: "They are moved to a temporary holding area before deletion" },
      { q: "Which of these is an operating system?", options: ["Google Chrome", "Microsoft Word", "Windows 11", "YouTube"], a: "Windows 11" }
    ],
    intermediate: [
      { q: "What does RAM stand for?", options: ["Read Access Memory", "Random Access Memory", "Run Active Module", "Rapid Allocation Matrix"], a: "Random Access Memory" },
      { q: "Which of these acts as temporary storage that is cleared when the computer turns off?", options: ["Hard Disk Drive (HDD)", "Solid State Drive (SSD)", "RAM", "ROM"], a: "RAM" },
      { q: "What is the main purpose of an operating system?", options: ["To browse web pages", "To manage computer hardware and software resources", "To run multiplayer games", "To scan for hardware dust"], a: "To manage computer hardware and software resources" },
      { q: "Which unit represents approximately 1 billion bytes of data?", options: ["Kilobyte (KB)", "Megabyte (MB)", "Gigabyte (GB)", "Terabyte (TB)"], a: "Gigabyte (GB)" },
      { q: "What does IP stand for in IP Address?", options: ["Internet Protocol", "Internal Program", "Interactive Process", "Intranet Port"], a: "Internet Protocol" }
    ],
    challenging: [
      { q: "Which component coordinates operations between CPU, RAM, and PCIe devices on a motherboard?", options: ["BIOS chip", "Southbridge/Chipset", "Graphics Processing Unit", "Cache Memory"], a: "Southbridge/Chipset" }
    ],
    advanced: [
      { q: "What is the purpose of virtual memory in a modern operating system?", options: ["To speed up the network interface card", "To simulate extra RAM by using space on the hard drive/SSD", "To store BIOS configurations permanently", "To execute encrypted graphics workloads"], a: "To simulate extra RAM by using space on the hard drive/SSD" }
    ],
    industry: [
      { q: "In computer networking, what does DNS stand for, and what is its primary function?", options: ["Domain Name System: translates domain names to IP addresses", "Data Network Service: manages file transfers over FTP", "Direct Network Serializer: manages concurrent port bindings", "Dynamic Node Server: assigns local DHCP leases"], a: "Domain Name System: translates domain names to IP addresses" }
    ]
  },
  hardware_quiz: {
    moderate: [
      { q: "Which hardware device prints documents on paper?", options: ["Monitor", "Printer", "Speaker", "Scanner"], a: "Printer" },
      { q: "What is a mouse used for?", options: ["To play sound", "To point and click on screen items", "To heat the computer", "To store movies"], a: "To point and click on screen items" },
      { q: "Which of these is an input device?", options: ["Speaker", "Keyboard", "Monitor", "Printer"], a: "Keyboard" }
    ],
    intermediate: [
      { q: "Which storage drive has no moving parts and is much faster than a standard Hard Disk Drive?", options: ["CD-ROM", "Solid State Drive (SSD)", "Floppy Disk", "Magnetic Tape"], a: "Solid State Drive (SSD)" }
    ],
    challenging: [
      { q: "What does BIOS stand for?", options: ["Binary Input Output System", "Basic Input Output System", "Board Integrated Operating Software", "Basic Instruction Operations System"], a: "Basic Input Output System" }
    ],
    advanced: [
      { q: "Which electrical component in a computer converts AC power from a wall outlet to low-voltage DC power?", options: ["Motherboard", "Power Supply Unit (PSU)", "CPU VRM", "Uninterruptible Power Supply (UPS)"], a: "Power Supply Unit (PSU)" }
    ],
    industry: [
      { q: "Which CPU component executes instruction decoding and schedules pipelines?", options: ["Arithmetic Logic Unit (ALU)", "Control Unit (CU)", "Register File", "L1 Cache Controller"], a: "Control Unit (CU)" }
    ]
  },
  office_speed: {
    moderate: [
      { q: "Which program is best suited for typing an essay?", options: ["Microsoft Excel", "Microsoft Word", "Microsoft PowerPoint", "Microsoft Access"], a: "Microsoft Word" },
      { q: "In MS Word, how do you make selected text look thicker/darker?", options: ["Italic button (I)", "Bold button (B)", "Underline button (U)", "Font size dropdown"], a: "Bold button (B)" }
    ],
    intermediate: [
      { q: "In MS Excel, what symbol must you type first to start a formula?", options: ["+", "@", "=", "#"], a: "=" }
    ],
    challenging: [
      { q: "In MS Excel, which function should you use to search for a value in the leftmost column of a table?", options: ["INDEX", "HLOOKUP", "VLOOKUP", "MATCH"], a: "VLOOKUP" }
    ],
    advanced: [
      { q: "In MS Excel, which feature allows you to summarize and analyze large datasets without using formulas?", options: ["Mail Merge", "PivotTable", "Conditional Formatting", "Data Validation"], a: "PivotTable" }
    ],
    industry: [
      { q: "In MS Word, what tool is used to generate personalized letters or envelopes for a large contact list?", options: ["Macro Recorder", "Mail Merge", "Styles Pane", "Cross-Reference"], a: "Mail Merge" }
    ]
  },
  html_builder: {
    moderate: [
      { q: "Which tag is used to create a clickable hyperlink in HTML?", options: ["<a>", "<link>", "<href>", "<button>"], a: "<a>" },
      { q: "What is the correct HTML tag for the largest heading?", options: ["<h6>", "<head>", "<heading>", "<h1>"], a: "<h1>" }
    ],
    intermediate: [
      { q: "What CSS property is used to change the background color of an element?", options: ["color", "background-color", "bg-color", "fill"], a: "background-color" }
    ],
    challenging: [
      { q: "Which HTML5 element is used to specify a footer for a document or section?", options: ["<bottom>", "<footer>", "<section-bottom>", "<end>"], a: "<footer>" }
    ],
    advanced: [
      { q: "Which CSS layout module allows you to align items in a one-dimensional row or column with dynamic sizing?", options: ["CSS Grid", "Flexbox", "Float", "Absolute Positioning"], a: "Flexbox" }
    ],
    industry: [
      { q: "What does semantic HTML improve besides code readability?", options: ["Browser rendering speed", "Search Engine Optimization (SEO) and accessibility for screen readers", "Database query execution times", "Frontend security handshakes"], a: "Search Engine Optimization (SEO) and accessibility for screen readers" }
    ]
  }
};

// Fallbacks for missing pools to prevent crashes
for (const key of ['comp_fund', 'hardware_quiz', 'office_speed', 'html_builder']) {
  const levels = ['moderate', 'intermediate', 'challenging', 'advanced', 'industry'];
  for (const lvl of levels) {
    if (!QUIZ_POOLS[key][lvl] || QUIZ_POOLS[key][lvl].length === 0) {
      QUIZ_POOLS[key][lvl] = QUIZ_POOLS[key]['moderate'] || QUIZ_POOLS['prog_logic']['moderate'];
    }
  }
}

const TYPING_POOL = {
  moderate: [
    "Computers are helpful tools. We use the keyboard to type words. The mouse lets us click on files.",
    "Web browsers help us find websites on the internet. We can learn many interesting things here."
  ],
  intermediate: [
    "Variables are containers for storing data values. In Python, you can define a variable without declaring its data type.",
    "A computer network is a group of connected devices. Devices communicate with each other using standard IP protocols."
  ],
  challenging: [
    "Data structures like stacks and queues are fundamental in software engineering. Stacks follow a Last In First Out order, whereas queues operate on First In First Out guidelines.",
    "In object-oriented programming, classes serve as blueprints for objects. Encapsulation helps hide internal object states and require all interaction through public methods."
  ],
  advanced: [
    "Vite is a modern frontend build tool that is extremely fast. It leverages native ES modules in the browser to deliver blazing fast Hot Module Replacement during development.",
    "Asynchronous programming in JavaScript allows non-blocking executions. Promises and the async/await syntax help write clean code that handles network requests concurrently."
  ],
  industry: [
    "Cloud computing platforms like Google Cloud Platform offer scalable container orchestration systems. Kubernetes manages containerized applications across cluster nodes to guarantee high availability.",
    "Implementing JSON Web Token authentication requires signing payloads with a secure private key. The token is sent in the Authorization header using the Bearer schema to validate API requests."
  ]
};

const MEMORY_POOL = {
  moderate: [
    { term: "Mouse", definition: "Handheld pointing device" },
    { term: "Keyboard", definition: "Device with keys to type" },
    { term: "Monitor", definition: "Screen displaying visuals" },
    { term: "Printer", definition: "Prints digital files on paper" }
  ],
  intermediate: [
    { term: "RAM", definition: "Temporary volatile memory" },
    { term: "SSD", definition: "Fast non-volatile storage" },
    { term: "CPU", definition: "Main central processor" },
    { term: "OS", definition: "System resources manager" }
  ],
  challenging: [
    { term: "Stack", definition: "LIFO data structure" },
    { term: "Queue", definition: "FIFO data structure" },
    { term: "Array", definition: "Contiguous indices list" },
    { term: "Graph", definition: "Nodes connected by edges" }
  ],
  advanced: [
    { term: "IP Address", definition: "Unique network identifier" },
    { term: "DNS", definition: "Translates domains to IPs" },
    { term: "Router", definition: "Forwards data packet streams" },
    { term: "Port", definition: "Logical connection channel" }
  ],
  industry: [
    { term: "Docker", definition: "Containerization engine" },
    { term: "Nginx", definition: "Reverse proxy server" },
    { term: "SQL", definition: "Relational query language" },
    { term: "JWT", definition: "Encrypted token schema" }
  ]
};

const BINARY_POOL = {
  moderate: [
    { decimal: 3, binary: "0011" },
    { decimal: 5, binary: "0101" },
    { decimal: 8, binary: "1000" },
    { decimal: 10, binary: "1010" },
    { decimal: 12, binary: "1100" }
  ],
  intermediate: [
    { decimal: 7, binary: "0111" },
    { decimal: 9, binary: "1001" },
    { decimal: 11, binary: "1011" },
    { decimal: 13, binary: "1101" },
    { decimal: 15, binary: "1111" }
  ],
  challenging: [
    { decimal: 1, binary: "0001" },
    { decimal: 4, binary: "0100" },
    { decimal: 6, binary: "0110" },
    { decimal: 14, binary: "1110" },
    { decimal: 2, binary: "0010" }
  ],
  advanced: [
    { decimal: 5, binary: "0101" },
    { decimal: 10, binary: "1010" },
    { decimal: 12, binary: "1100" },
    { decimal: 7, binary: "0111" },
    { decimal: 13, binary: "1101" }
  ],
  industry: [
    { decimal: 15, binary: "1111" },
    { decimal: 8, binary: "1000" },
    { decimal: 9, binary: "1001" },
    { decimal: 11, binary: "1011" },
    { decimal: 14, binary: "1110" }
  ]
};

const SHORTCUT_POOL = {
  moderate: [
    { action: "Copy Text", keys: "Ctrl+C" },
    { action: "Paste Text", keys: "Ctrl+V" },
    { action: "Undo Action", keys: "Ctrl+Z" },
    { action: "Save File", keys: "Ctrl+S" },
    { action: "Select All", keys: "Ctrl+A" }
  ],
  intermediate: [
    { action: "Find Word", keys: "Ctrl+F" },
    { action: "Print Page", keys: "Ctrl+P" },
    { action: "Cut Text", keys: "Ctrl+X" },
    { action: "New Window", keys: "Ctrl+N" },
    { action: "Refresh Page", keys: "F5" }
  ],
  challenging: [
    { action: "Redo Action", keys: "Ctrl+Y" },
    { action: "Bold Text", keys: "Ctrl+B" },
    { action: "Italic Text", keys: "Ctrl+I" },
    { action: "Underline Text", keys: "Ctrl+U" },
    { action: "Close Tab", keys: "Ctrl+W" }
  ],
  advanced: [
    { action: "Open Inspector", keys: "Ctrl+Shift+I" },
    { action: "Close Window", keys: "Alt+F4" },
    { action: "Switch Window", keys: "Alt+Tab" },
    { action: "Lock Computer", keys: "Ctrl+Alt+Del" },
    { action: "Task Manager", keys: "Ctrl+Shift+ESC" }
  ],
  industry: [
    { action: "Force Refresh", keys: "Ctrl+F5" },
    { action: "Open Developer Console", keys: "F12" },
    { action: "Inspect Node", keys: "Ctrl+Shift+C" },
    { action: "Search Command Palette", keys: "Ctrl+Shift+P" },
    { action: "Clear Browsing Data", keys: "Ctrl+Shift+Delete" }
  ]
};

const PYTHON_POOL = {
  moderate: [
    { title: "Define variable and print it", lines: ["name = 'Arjun'", "print(name)"], scrambled: [1, 0] },
    { title: "Perform addition and print", lines: ["x = 5", "y = 10", "print(x + y)"], scrambled: [2, 0, 1] }
  ],
  intermediate: [
    { title: "Loop from 0 to 4", lines: ["for i in range(5):", "    print(i)"], scrambled: [1, 0] },
    { title: "If condition check", lines: ["x = 7", "if x > 5:", "    print('Large')"], scrambled: [2, 0, 1] }
  ],
  challenging: [
    { title: "Calculate list sum", lines: ["numbers = [1, 2, 3]", "total = sum(numbers)", "print(total)"], scrambled: [1, 2, 0] },
    { title: "Write a simple function", lines: ["def greet(name):", "    return 'Hello ' + name", "print(greet('Arjun'))"], scrambled: [1, 0, 2] }
  ],
  advanced: [
    { title: "List comprehension double values", lines: ["nums = [1, 2, 3]", "doubled = [x * 2 for x in nums]", "print(doubled)"], scrambled: [2, 0, 1] },
    { title: "Read and print file lines", lines: ["with open('test.txt') as f:", "    lines = f.readlines()", "    print(lines)"], scrambled: [1, 0, 2] }
  ],
  industry: [
    { title: "Filter even numbers with lambda", lines: ["data = [1, 2, 3, 4]", "evens = list(filter(lambda x: x % 2 == 0, data))", "print(evens)"], scrambled: [2, 0, 1] },
    { title: "Custom Class constructor", lines: ["class User:", "    def __init__(self, uid):", "        self.uid = uid", "u = User(101)"], scrambled: [1, 3, 0, 2] }
  ]
};

// --- Question Rotation & Retrieval Logic ---

export const getQuestionsForGame = (gameId, user) => {
  const difficulty = getUserDifficulty(user);
  
  if (gameId === 'typing_chal') {
    const list = TYPING_POOL[difficulty] || TYPING_POOL.moderate;
    return list;
  }
  if (gameId === 'memory_match') {
    const list = MEMORY_POOL[difficulty] || MEMORY_POOL.moderate;
    return list;
  }
  if (gameId === 'binary_conv') {
    const list = BINARY_POOL[difficulty] || BINARY_POOL.moderate;
    return list;
  }
  if (gameId === 'shortcut_key') {
    const list = SHORTCUT_POOL[difficulty] || SHORTCUT_POOL.moderate;
    return list;
  }
  if (gameId === 'python_puzzle') {
    const list = PYTHON_POOL[difficulty] || PYTHON_POOL.moderate;
    return list;
  }

  // Quiz games
  const pool = QUIZ_POOLS[gameId]?.[difficulty] || QUIZ_POOLS.prog_logic.moderate;
  
  // Implement Rotation logic to prevent repeat questions
  const cacheKey = `recent_q_${user?.uid || 'anon'}_${gameId}`;
  let recentIds = [];
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) recentIds = JSON.parse(cached);
  } catch (e) {
    console.warn("Failed to parse recent questions cache:", e);
  }

  // Filter out recent questions if we have a pool larger than the limit
  let available = pool.filter((_, idx) => !recentIds.includes(idx));
  if (available.length < Math.min(pool.length, 5)) {
    // Clear recent cache if exhausted
    recentIds = [];
    localStorage.removeItem(cacheKey);
    available = [...pool];
  }

  // Shuffle available questions
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  
  // Select top 5
  const selected = shuffled.slice(0, 5);
  
  // Track indices in pool
  const selectedIndices = selected.map(q => pool.indexOf(q));
  const newRecent = [...recentIds, ...selectedIndices].slice(-15); // keep last 15 seen
  localStorage.setItem(cacheKey, JSON.stringify(newRecent));

  return selected;
};
