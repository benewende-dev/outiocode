#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@opencode-ai/script"
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

async function publish(dir: string, name: string, version: string) {
  // GitHub artifact downloads can drop the executable bit, and Docker uses the
  // unpacked dist binaries directly rather than the published tarball.
  if (process.platform !== "win32") await $`chmod -R 755 .`.cwd(dir)
  if (await published(name, version)) {
    console.log(`already published ${name}@${version}`)
    return
  }
  await $`bun pm pack`.cwd(dir)
  await $`npm publish *.tgz --access public --tag ${Script.channel}`.cwd(dir)
}

const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const pkg = await Bun.file(`./dist/${filepath}`).json()
  binaries[pkg.name] = pkg.version
}
console.log("binaries", binaries)
const version = Object.values(binaries)[0]

await $`mkdir -p ./dist/${pkg.name}`
await $`mkdir -p ./dist/${pkg.name}/bin`
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
await Bun.file(`./dist/${pkg.name}/LICENSE`).write(await Bun.file("../../LICENSE").text())
await Bun.file(`./dist/${pkg.name}/bin/${pkg.name}.exe`).write(
  [
    `echo "Error: ${pkg.name}'s postinstall script was not run." >&2`,
    'echo "" >&2',
    'echo "This occurs when using --ignore-scripts during installation, or when using a" >&2',
    'echo "package manager like pnpm that does not run postinstall scripts by default." >&2',
    'echo "" >&2',
    'echo "To fix this, run the postinstall script manually:" >&2',
    `echo "  cd node_modules/${pkg.name} && node postinstall.mjs" >&2`,
    'echo "" >&2',
    `echo "Or reinstall ${pkg.name} without the --ignore-scripts flag." >&2`,
    "exit 1",
    "",
  ].join("\n"),
)

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      bin: {
        [pkg.name]: `./bin/${pkg.name}.exe`,
      },
      scripts: {
        postinstall: "node ./postinstall.mjs",
      },
      version: version,
      license: pkg.license,
      os: ["darwin", "linux", "win32"],
      cpu: ["arm64", "x64"],
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

const tasks = Object.entries(binaries).map(async ([name]) => {
  await publish(`./dist/${name}`, name, binaries[name])
})
await Promise.all(tasks)
await publish(`./dist/${pkg.name}`, pkg.name, version)

// ─── Distribution OS-level (Docker / AUR / Homebrew) ───────────────────────
// OutioCode ne publie sur ces canaux que si OUTIO_PUBLISH_EXTRAS=1 ET que les
// variables d'infra correspondantes sont fournies. Tant que le dépôt GitHub /
// le registre d'images ne sont pas décidés, `bun run script/publish.ts` ne
// fait QUE le npm publish ci-dessus — rien d'autre.
//   GH_REPO              ex: "outio-app/outiocode"   (artefacts de release)
//   OUTIO_DOCKER_IMAGE   ex: "ghcr.io/outio-app/outio"
//   OUTIO_HOMEBREW_TAP   ex: "outio-app/homebrew-tap"
//   OUTIO_AUR_PKG        ex: "outio-bin"
const PUBLISH_EXTRAS = process.env.OUTIO_PUBLISH_EXTRAS === "1"
const REPO = process.env.GH_REPO
const DOCKER_IMAGE = process.env.OUTIO_DOCKER_IMAGE
const HOMEBREW_TAP = process.env.OUTIO_HOMEBREW_TAP
const AUR_PKG = process.env.OUTIO_AUR_PKG
const BIN = pkg.name // "outio"
const DESC = "OutioCode — l'agent de code agentique, branché sur Outio."

if (!Script.preview && PUBLISH_EXTRAS) {
  if (!REPO) {
    console.error("GH_REPO requis (ex: outio-app/outiocode) pour générer les URLs de release")
    process.exit(1)
  }
  const releaseBase = `https://github.com/${REPO}/releases/download/v${Script.version}`

  // Docker (optionnel)
  if (DOCKER_IMAGE) {
    const tags = [`${DOCKER_IMAGE}:${version}`, `${DOCKER_IMAGE}:${Script.channel}`]
    const tagFlags = tags.flatMap((t) => ["-t", t])
    await $`docker buildx build --platform linux/amd64,linux/arm64 ${tagFlags} --push .`
  }

  // SHA des artefacts (noms outio-*, produits par build.ts)
  const arm64Sha = await $`sha256sum ./dist/${BIN}-linux-arm64.tar.gz | cut -d' ' -f1`.text().then((x) => x.trim())
  const x64Sha = await $`sha256sum ./dist/${BIN}-linux-x64.tar.gz | cut -d' ' -f1`.text().then((x) => x.trim())
  const macX64Sha = await $`sha256sum ./dist/${BIN}-darwin-x64.zip | cut -d' ' -f1`.text().then((x) => x.trim())
  const macArm64Sha = await $`sha256sum ./dist/${BIN}-darwin-arm64.zip | cut -d' ' -f1`.text().then((x) => x.trim())

  const [pkgver, _subver = ""] = Script.version.split(/(-.*)/, 2)

  // AUR (optionnel)
  if (AUR_PKG) {
    const binaryPkgbuild = [
      "# Maintainer: Outio",
      "",
      `pkgname='${AUR_PKG}'`,
      `pkgver=${pkgver}`,
      `_subver=${_subver}`,
      "options=('!debug' '!strip')",
      "pkgrel=1",
      `pkgdesc='${DESC}'`,
      `url='https://github.com/${REPO}'`,
      "arch=('aarch64' 'x86_64')",
      "license=('MIT')",
      `provides=('${BIN}')`,
      `conflicts=('${BIN}')`,
      "depends=('ripgrep')",
      "",
      `source_aarch64=("\${pkgname}_\${pkgver}_aarch64.tar.gz::${releaseBase.replace(`v${Script.version}`, "v${pkgver}${_subver}")}/${BIN}-linux-arm64.tar.gz")`,
      `sha256sums_aarch64=('${arm64Sha}')`,
      `source_x86_64=("\${pkgname}_\${pkgver}_x86_64.tar.gz::${releaseBase.replace(`v${Script.version}`, "v${pkgver}${_subver}")}/${BIN}-linux-x64.tar.gz")`,
      `sha256sums_x86_64=('${x64Sha}')`,
      "",
      "package() {",
      `  install -Dm755 ./${BIN} "\${pkgdir}/usr/bin/${BIN}"`,
      "}",
      "",
    ].join("\n")

    for (let i = 0; i < 30; i++) {
      try {
        await $`rm -rf ./dist/aur-${AUR_PKG}`
        await $`git clone ssh://aur@aur.archlinux.org/${AUR_PKG}.git ./dist/aur-${AUR_PKG}`
        await $`cd ./dist/aur-${AUR_PKG} && git checkout master`
        await Bun.file(`./dist/aur-${AUR_PKG}/PKGBUILD`).write(binaryPkgbuild)
        await $`cd ./dist/aur-${AUR_PKG} && makepkg --printsrcinfo > .SRCINFO`
        await $`cd ./dist/aur-${AUR_PKG} && git add PKGBUILD .SRCINFO`
        if ((await $`cd ./dist/aur-${AUR_PKG} && git diff --cached --quiet`.nothrow()).exitCode === 0) break
        await $`cd ./dist/aur-${AUR_PKG} && git commit -m "Update to v${Script.version}"`
        await $`cd ./dist/aur-${AUR_PKG} && git push`
        break
      } catch {
        continue
      }
    }
  }

  // Homebrew (optionnel)
  if (HOMEBREW_TAP) {
    const className = BIN.charAt(0).toUpperCase() + BIN.slice(1) // "Outio"
    const homebrewFormula = [
      "# typed: false",
      "# frozen_string_literal: true",
      "",
      `class ${className} < Formula`,
      `  desc "${DESC}"`,
      `  homepage "https://github.com/${REPO}"`,
      `  version "${Script.version.split("-")[0]}"`,
      "",
      `  depends_on "ripgrep"`,
      "",
      "  on_macos do",
      "    if Hardware::CPU.intel?",
      `      url "${releaseBase}/${BIN}-darwin-x64.zip"`,
      `      sha256 "${macX64Sha}"`,
      "",
      "      def install",
      `        bin.install "${BIN}"`,
      "      end",
      "    end",
      "    if Hardware::CPU.arm?",
      `      url "${releaseBase}/${BIN}-darwin-arm64.zip"`,
      `      sha256 "${macArm64Sha}"`,
      "",
      "      def install",
      `        bin.install "${BIN}"`,
      "      end",
      "    end",
      "  end",
      "",
      "  on_linux do",
      "    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?",
      `      url "${releaseBase}/${BIN}-linux-x64.tar.gz"`,
      `      sha256 "${x64Sha}"`,
      "      def install",
      `        bin.install "${BIN}"`,
      "      end",
      "    end",
      "    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?",
      `      url "${releaseBase}/${BIN}-linux-arm64.tar.gz"`,
      `      sha256 "${arm64Sha}"`,
      "      def install",
      `        bin.install "${BIN}"`,
      "      end",
      "    end",
      "  end",
      "end",
      "",
      "",
    ].join("\n")

    const token = process.env.GITHUB_TOKEN
    if (!token) {
      console.error("GITHUB_TOKEN requis pour mettre à jour le tap Homebrew")
      process.exit(1)
    }
    const tap = `https://x-access-token:${token}@github.com/${HOMEBREW_TAP}.git`
    await $`rm -rf ./dist/homebrew-tap`
    await $`git clone ${tap} ./dist/homebrew-tap`
    await Bun.file(`./dist/homebrew-tap/${BIN}.rb`).write(homebrewFormula)
    await $`cd ./dist/homebrew-tap && git add ${BIN}.rb`
    if ((await $`cd ./dist/homebrew-tap && git diff --cached --quiet`.nothrow()).exitCode !== 0) {
      await $`cd ./dist/homebrew-tap && git commit -m "Update to v${Script.version}"`
      await $`cd ./dist/homebrew-tap && git push`
    }
  }
}
