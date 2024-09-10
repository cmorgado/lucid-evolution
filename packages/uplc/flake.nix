{
  description = "A Nix-flake-based Rust development environment";

  nixConfig = {
    bash-prompt = "\\[\\e[0;92m\\][\\[\\e[0;92m\\]nix develop:\\[\\e[0;92m\\]\\w\\[\\e[0;92m\\]]\\[\\e[0;92m\\]$ \\[\\e[0m\\]";
  };

  inputs = {
    nixpkgs.url = "https://flakehub.com/f/NixOS/nixpkgs/0.1.*.tar.gz";


    rust-overlay.url = "github:oxalica/rust-overlay"; # A helper for Rust + Nix
  };

  outputs = { self, nixpkgs, rust-overlay }:
    let
      overlays = [
        rust-overlay.overlays.default
        (final: prev: {
          # clang = final.llvmPackages_18.clang;
          # clang-tools = final.llvmPackages_18.clang-tools;
          rustToolchain =
            let
              rust = prev.rust-bin;
            in
            if builtins.pathExists ./rust-toolchain.toml then
              rust.fromRustupToolchainFile ./rust-toolchain.toml
            else if builtins.pathExists ./rust-toolchain then
              rust.fromRustupToolchainFile ./rust-toolchain
            else
              rust.stable.latest.default;
        })
      ];
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forEachSupportedSystem = f: nixpkgs.lib.genAttrs supportedSystems (system: f {
        pkgs = import nixpkgs { inherit overlays system; };
      });
    in
    {
      devShells = forEachSupportedSystem ({ pkgs }: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            rustToolchain
            openssl
            pkg-config
            cargo-deny
            cargo-edit
            cargo-watch
            rust-analyzer
            wasm-pack
            bun
            corepack_20
            nodejs_20
            # clang_15
            # clangStdenv
            # boost
            # llvm
            # emscripten
            # C/C++ Libraries
            # clang-tools
            # llvmPackages_18.clang
            # llvmPackages_18.clang-tools
            #   llvmPackages_14.clang-tools

            # cmake
            # codespell
            # conan
            # cppcheck
            # doxygen
            # gtest
            # lcov
            # vcpkg
            # vcpkg-tool
          ]
          ++ (if system == "aarch64-darwin" then [ ] else [ gdb ]);
          # shellHook = ''
          #    export BLST_TEST_NO_STD=ok
          #   export BLST_NO_ASM=ok
          # '';
          # shellHook = ''
          #                   export CC=${pkgs.llvmPackages_16.clang-unwrapped}/bin/clang
          #                   export CXX=${pkgs.llvmPackages_16.clang-unwrapped}/bin/clang++
          #                   export PATH=${pkgs.llvmPackages_16.clang-unwrapped}/bin:$PATH
          #       #             export CFLAGS="-O2 -ffunction-sections -fdata-sections -fPIC"
          #       #             export CXXFLAGS="-O2 -ffunction-sections -fdata-sections -fPIC"
          #       #             export CFLAGS="-ffreestanding"
          #       # export CXXFLAGS="-ffreestanding"
          #               export CC_wasm32_unknown_unknown = "${pkgs.llvmPackages_16.clang-unwrapped}/bin/clang-16";
          #   export AR_wasm32_unknown_unknown = "${pkgs.llvmPackages_16.libllvm}/bin/llvm-ar";
          #   export CFLAGS_wasm32_unknown_unknown = "-I ${pkgs.llvmPackages_16.libclang.lib}/lib/clang/16/include/";
          #
          #
          #                   echo "Using Clang version: $(clang --version)"
          # '';
          shellHook = ''
            export LIBCLANG_PATH=${pkgs.libclang.lib}/lib/
            export LD_LIBRARY_PATH=${pkgs.openssl}/lib:$LD_LIBRARY_PATH
            export CC_wasm32_unknown_unknown=${pkgs.llvmPackages_16.clang-unwrapped}/bin/clang-16
            export CFLAGS_wasm32_unknown_unknown="-I ${pkgs.llvmPackages_14.libclang.lib}/lib/clang/14.0.6/include/"
          '';
        };
      });
    };
}
