{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.npm
    pkgs.nodePackages.typescript
    pkgs.git
    pkgs.curl
  ];

  env = {
    NODE_OPTIONS = "--max-old-space-size=4096";
  };
}
