## [0.1.20] - 2025-10-18

### PR: [Dev](https://github.com/openchatui/openchat/pull/57)

### Fixed
- Resolved type errors related to user metadata in the admin panel. (https://github.com/openchatui/openchat/commit/7e47490d10d82194a714aa0794ce31127eab8803)
- Fixed incorrect handling of admin panel user and group API URLs. (https://github.com/openchatui/openchat/commit/bcd6005677a693f236f6953bb3fee3b5f49a936f)

## [0.1.19] - 2025-10-18

### PR: [Dev](https://github.com/openchatui/openchat/pull/54)

### Added
- Added API route support for user operations, including origin and authentication checks. (https://github.com/openchatui/openchat/commit/7b737e7e28d9c04f0c98acbe0be7b0efc7cb65bf)

### Changed
- Refactored user-related logic from server actions to API routes and hooks, moving relevant files. (https://github.com/openchatui/openchat/commit/058cc4b2efff6fdf95ec87cb22af6a20bef2f6cb)
- Moved admin audio configuration logic into hooks and library functions for better modularity. (https://github.com/openchatui/openchat/commit/fe5723943bd27fa1e95a050d5be343023045b49c)
- Moved API functions to the client directory instead of client/api for improved structure. (https://github.com/openchatui/openchat/commit/788fb9751a6e4201fe3f6fba02e7fbf921c11596)
- Renamed and reorganized library code into auth, core, modules, sdk, and db as a data access layer. (https://github.com/openchatui/openchat/commit/e70cd328744ebc10f6235a694df8cb5ffc68bb9c)
- Renamed sdk to api in the library and moved associated files. (https://github.com/openchatui/openchat/commit/533e33c7c3fee37bcf0935c10a9923bb8039acd7)

## [0.1.18] - 2025-10-16

### PR: [Dev to main](https://github.com/openchatui/openchat/pull/51)

### Added
- Added a CONTRIBUTING.md file outlining contribution guidelines, code of conduct, API-first development, branching strategy, commit message conventions, and PR checklist. (https://github.com/openchatui/openchat/commit/66bba9484868d3eb4f90252ddbef7763b2cf993d)

## [0.1.17] - 2025-10-16

### PR: [Dev to main](https://github.com/openchatui/openchat/pull/48)

### Added
- Introduced API endpoints for Ollama model pull, list, and delete operations. (https://github.com/openchatui/openchat/commit/09dd7fbe210cf8563208726b5e58e3485e907106)
- Added admin UI components to manage Ollama models, including download and delete actions. (https://github.com/openchatui/openchat/commit/09dd7fbe210cf8563208726b5e58e3485e907106)

## [0.1.16] - 2025-10-14

### PR: [Dev to Main](https://github.com/openchatui/openchat/pull/44)

### Added
- Introduced an authentication toggle via the AUTH environment variable, enabling a public landing mode while keeping admin protected. (https://github.com/openchatui/openchat/commit/6b94e06bfb4a4ae6a9b652656c1bdf6d749b7268)
- Added API endpoints for archiving and deleting chats to support optimistic UI updates and external integrations. (https://github.com/openchatui/openchat/commit/1a7172c0729919ad1dbe07b2ad9f081199e7ef22)

### Fixed
- Fixed optimistic updates and API endpoint handling for chat archive and delete actions. (https://github.com/openchatui/openchat/commit/1a7172c0729919ad1dbe07b2ad9f081199e7ef22)

### Changed
- Updated Docker Compose and documentation to use the GitHub Container Registry (ghcr) image and document the new AUTH toggle. (https://github.com/openchatui/openchat/commit/656f4412af98c76d7cd87da76a884a1fc830fafa)

## [0.1.15] - 2025-10-12

### PR: [ci: mirgrate to ghcr](https://github.com/openchatui/openchat/pull/38)

### Changed
- Migrated Docker image publishing from Docker Hub to GitHub Container Registry (ghcr.io) in CI workflows. (https://github.com/openchatui/openchat/commit/c1c53ac33454d009e59f8b0296625abb6dbf923a)

## [0.1.14] - 2025-10-11

### PR: [Release: v0.1.14](https://github.com/openchatui/openchat/pull/35)

### Added
- Added LICENSE.md file to clarify project licensing under AGPLv3 with additional terms. (https://github.com/openchatui/openchat/commit/efadd628b0bdd8dd738ce1a9b84e4157289f7c40)
- Added new assets including OpenChat logo and GIFs for text, image, and video generation demos. (https://github.com/openchatui/openchat/commit/efadd628b0bdd8dd738ce1a9b84e4157289f7c40)

### Fixed
- Fixed missing browserless tools to ensure all expected web browsing features are available. (https://github.com/openchatui/openchat/commit/af4ee0529186b3bd2945f94a05e44b99ca23677b)
- Fixed GIFs not rendering in README by updating to better Giphy links. (https://github.com/openchatui/openchat/commit/82d74f22a19c3f7a76dbebbd476f2350e2ee430d)
- Fixed image hosting by moving to Giphy CDN for improved reliability. (https://github.com/openchatui/openchat/commit/e83fc796aa1c230e17dd186913c8fd7f3be33819)
- Reverted GIF hosting back to repository assets to resolve rendering issues. (https://github.com/openchatui/openchat/commit/2b2ecc9370291c779024077f49d060a957d9223c)

### Changed
- Updated README with new badges, project description, and demo images for improved clarity and presentation. (https://github.com/openchatui/openchat/commit/efadd628b0bdd8dd738ce1a9b84e4157289f7c40)
- Refactored browserless provider and web service logic for improved robustness and type safety. (https://github.com/openchatui/openchat/commit/af4ee0529186b3bd2945f94a05e44b99ca23677b)
- Reduced GIF file sizes to optimize repository size and loading times. (https://github.com/openchatui/openchat/commit/e8685978bec48cee75c59cd0e2d743a125f6ec04)
- Updated .dockerignore, .gitignore, and docker-compose.yml for improved development and deployment workflow. (https://github.com/openchatui/openchat/commit/efadd628b0bdd8dd738ce1a9b84e4157289f7c40)

## [0.1.13] - 2025-10-10

### PR: [release dev to main](https://github.com/openchatui/openchat/pull/29)

### Fixed
- Resolved issues with image and video tools to ensure proper functionality. (https://github.com/openchatui/openchat/commit/adf49a17c6a3a9c2e9c076e90a9da45401618d6f)
- Restored status display in the video component. (https://github.com/openchatui/openchat/commit/7fa640ccd2970a89f705b414cbdee96f8d8ed94d)

### Changed
- Updated image service to save generated images under data/images for runtime persistence. (https://github.com/openchatui/openchat/commit/adf49a17c6a3a9c2e9c076e90a9da45401618d6f)
- Refactored video service to ensure API parameters are passed as strings as required by the OpenAI Videos API. (https://github.com/openchatui/openchat/commit/adf49a17c6a3a9c2e9c076e90a9da45401618d6f)
- Improved chat input restoration to correctly handle video generation state from session storage. (https://github.com/openchatui/openchat/commit/adf49a17c6a3a9c2e9c076e90a9da45401618d6f)
- Fixed auto changelog detection in CI workflow to trigger on main branch merges. (https://github.com/openchatui/openchat/commit/afa668ed0dcc1538846defde7f9348a7e261d4fc)

## [0.1.12] - 2025-10-10

### Changed: Auto detect version/changelog if none added, create changelog and bump version, else auto bump and generate.

## [0.1.11] - 2025-10-10

### PR: [dev to main ](https://github.com/openchatui/openchat/pull/23)

### Changed
- Merged latest development changes into main branch to synchronize updates. (https://github.com/openchatui/openchat/pull/23)

## [0.1.10] - 2025-10-10

### PR: [ci: explicit checkout to pr](https://github.com/openchatui/openchat/pull/21)

### Changed
- Updated CI workflow to explicitly checkout the pull request branch and push to the correct ref. (https://github.com/openchatui/openchat/commit/3f86a4e9d5b1d453e6908d8b8beeb538362c192d)

## [0.1.9] - 2025-10-10

### PR: [ci fixes into main](https://github.com/openchatui/openchat/pull/17)

### Changed
- Updated the auto-changelog workflow to skip merges and refine triggering conditions for main branch PRs. (https://github.com/openchatui/openchat/commit/9e3b593aaa7520c76a5216731a6f215e9fafcec0)

## [0.1.8] - 2025-10-10

### PR: [Merge pull request #14 from openchatui/main](https://github.com/openchatui/openchat/pull/15)

### Changed
- Merged updates from the main branch to synchronize the codebase. (https://github.com/openchatui/openchat/commit/704e196159b17fabae90ec6e983727a9f40bc5d5)

## [0.1.7] - 2025-10-10

### PR: [feat: sora 2 tool/api](https://github.com/openchatui/openchat/pull/13)

### Added
- Introduced Sora 2 video generation tool and API endpoints, enabling video creation from prompts and admin configuration. (https://github.com/openchatui/openchat/commit/5c0f033a8a926589ebe7c0264844b066317e3ac6)
- Added Swagger UI CSS asset route and improved Swagger UI integration for API documentation. (https://github.com/openchatui/openchat/commit/5c0f033a8a926589ebe7c0264844b066317e3ac6)

### Fixed
- Fixed auto changelog CI error to ensure changelog generation works reliably. (https://github.com/openchatui/openchat/commit/47461df5a5b83d93d034716748c8c829bc7fe676)

### Changed
- Reduced the number of tokens passed to the summarize model in CI to optimize resource usage. (https://github.com/openchatui/openchat/commit/faf0d904539a55230b073db464e7a1d1469649d6)
- Switched CI model provider from GitHub to OpenAI for changelog generation. (https://github.com/openchatui/openchat/commit/30f1aab9122179834a2b6af6df24eb3465bc1b6f)

## [0.1.6] - 2025-10-09

### PR: [fix: nextauth redirect url hardcoded fixed](https://github.com/openchatui/openchat/pull/11)

### Added
- Updated CI workflow to utilize a GitHub App for automatic changelog generation. (https://github.com/openchatui/openchat/commit/cf8cabe97e31c1b3547e9232e836d177053caf38)

### Fixed
- Fixed hardcoded redirect URL in the Google Drive service to use the environment variable correctly. (https://github.com/openchatui/openchat/commit/2915819ed4b6fdbde61af0fdd492a9e624daa475)

## [0.1.5] - 2025-10-09

### PR: [build: update nextauth port to use port env](https://github.com/openchatui/openchat/pull/10)

### Changed
- Updated the NextAuth configuration to use an environment variable for the port instead of a hardcoded value. (https://github.com/openchatui/openchat/commit/53bd8b3560eafa507535ea333dd4f4c69f8390e8)

## [0.1.4] - 2025-10-08

### PR: [ci: enhance Docker workflow for multi-platform builds](https://github.com/apensotti/OpenChat/pull/9)

### Added
- Enhanced the Docker workflow to support multi-platform builds, allowing for builds on both amd64 and arm64 architectures. (https://github.com/apensotti/OpenChat/commit/d8f14efdba92222486f6699ad698a64f057f99a9)

## [0.1.3] - 2025-10-08

### PR: [fix: formatting in release encoding newlines](https://github.com/apensotti/OpenChat/pull/8)

### Fixed
- Fixed formatting issues in release encoding to handle newlines correctly. (https://github.com/apensotti/OpenChat/commit/a21389ebe2fa976e88d6f4c4a3d779cf987e38f0)

## [0.1.2] - 2025-10-08

### PR: [ ci/auto changelog and versioning](https://github.com/apensotti/OpenChat/pull/7)

### Added
- Introduced a new GitHub Actions workflow for automatic version bumping and changelog generation on pull requests. (https://github.com/apensotti/OpenChat/commit/4697860f3466d1f54761fff9ed1bf0f65b87448f)

### Fixed
- Fixed issues with the auto changelog generation process. (https://github.com/apensotti/OpenChat/commit/08458d28bd5452101882c87c9a99511f08168348)
- Corrected invalid JSON formatting in the changelog. (https://github.com/apensotti/OpenChat/commit/aa1a25a9bfe090bf53272242789c1761f1d2b01b)
- Ensured proper rendering of the CHANGELOG entry and updated the file accordingly. (https://github.com/apensotti/OpenChat/commit/19f7262307fc11b479bfdf8c817f0a7d81eb60d8)

## [0.1.0] - 2024-03-21

### Added
- Initial release
- Next.js application setup
- Docker support with multi-arch builds
- Authentication system
- Basic chat interface
- GitHub Actions for automated releases and Docker builds
