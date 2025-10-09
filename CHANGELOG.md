## [0.1.6] - 2025-10-09

### PR: [fix: nextauth redirect url hardcoded fixed](https://github.com/openchatui/openchat/pull/11)

### Added
- Updated CI workflow to use a GitHub App for automatic changelog generation. (https://github.com/openchatui/openchat/commit/cf8cabe97e31c1b3547e9232e836d177053caf38)

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
