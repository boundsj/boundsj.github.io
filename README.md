    #####      ####     #    #    #    #    #####      ####            #####  ###### #    # 
    #    #    #    #    #    #    ##   #    #    #    #                #    # #      #    # 
    #####     #    #    #    #    # #  #    #    #     ####            #    # #####  #    # 
    #    #    #    #    #    #    #  # #    #    #         #    ###    #    # #      #    # 
    #    #    #    #    #    #    #   ##    #    #    #    #    ###    #    # #       #  #  
    #####      ####      ####     #    #    #####      ####     ###    #####  ######   ##   
    
Powered by [Hugo](https://gohugo.io/)  

The active theme is `themes/bounds-ascii/`. The older LoveIt theme remains vendored; do not edit it. Root `layouts/` templates override theme templates.

GitHub Pages builds with Hugo Extended 0.154.5. A newer local Hugo can show `languageCode` deprecation warnings. `make serve` starts a draft-enabled Hugo server on port 1313. `make photo-poster` starts the FastAPI/Uvicorn photo tool on port 8000; that target first kills processes using the port and installs its Python requirements.

Build locally with `hugo --cleanDestinationDir`. For an exact output check, build to a separate directory and run `python3 scripts/compare-site-builds.py BASELINE_DIR NEW_BUILD_DIR`. The command checks every relative file path and byte.

© 2019 - 2026 Jesse Bounds | CC BY-NC 4.0
