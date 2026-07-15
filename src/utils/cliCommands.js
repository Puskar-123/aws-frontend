const reference = (owner, repository) => `${owner || "Owner"}/${repository || "Repository"}`;

export const buildInstallCommand = () => "npm install -g codehub-sbs-cli";
export const buildLoginCommand = () => "codehub login";
export const buildCloneCommand = (owner, repository) => `codehub clone ${reference(owner, repository)}`;
export const buildCloneUrlCommand = (owner, repository) => `codehub clone https://codehub.sbs/${reference(owner, repository)}`;
export const buildInitCommand = (owner, repository) => `codehub init ${reference(owner, repository)}`;

export const buildExistingProjectCommands = (owner, repository) => [
  "cd path-to-your-project",
  buildInitCommand(owner, repository),
  "codehub add .",
  "codehub status",
  'codehub commit -m "Initial commit"',
  "codehub push",
].join("\n");

export const buildNewProjectCommands = (owner, repository, platform = "windows") => {
  const name = repository || "Repository";
  const createReadme = platform === "unix" ? `echo "# ${name}" > README.md` : `"# ${name}" | Out-File README.md`;
  return [
    `mkdir ${name}`,
    `cd ${name}`,
    createReadme,
    buildInitCommand(owner, repository),
    "codehub add .",
    'codehub commit -m "Initial commit"',
    "codehub push",
  ].join("\n");
};

export const buildProtectedBranchCommands = (branch = "feature/initial-setup") => [
  `codehub branch ${branch}`,
  `codehub checkout ${branch}`,
  "codehub add .",
  'codehub commit -m "Initial project setup"',
  "codehub push",
].join("\n");
