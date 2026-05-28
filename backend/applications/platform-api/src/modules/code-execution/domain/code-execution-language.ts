export interface CodeExecutionLanguage {
  id: string;
  displayName: string;
  fileExtension: string;
  defaultTemplate?: string;
  judge0Id?: number;
  pistonLanguage?: string;
  pistonVersion?: string;
}

export const SUPPORTED_LANGUAGES: CodeExecutionLanguage[] = [
  {
    id: 'javascript',
    displayName: 'JavaScript',
    fileExtension: 'js',
    defaultTemplate: 'console.log("Hello, World!");',
    judge0Id: 63,
    pistonLanguage: 'javascript',
    pistonVersion: '18.15.0',
  },
  {
    id: 'python',
    displayName: 'Python',
    fileExtension: 'py',
    defaultTemplate: 'print("Hello, World!")',
    judge0Id: 71,
    pistonLanguage: 'python',
    pistonVersion: '3.10.0',
  },
  {
    id: 'cpp',
    displayName: 'C++',
    fileExtension: 'cpp',
    defaultTemplate: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
    judge0Id: 54,
    pistonLanguage: 'c++',
    pistonVersion: '10.2.0',
  },
  {
    id: 'java',
    displayName: 'Java',
    fileExtension: 'java',
    defaultTemplate: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
    judge0Id: 62,
    pistonLanguage: 'java',
    pistonVersion: '15.0.2',
  },
];
