pipeline {
    agent any

    tools {
        nodejs 'NodeJS'
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        SONARQUBE_ENV = 'SonarQube'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Client Dependencies') {
            steps {
                dir('client') {
                    bat 'npm install'
                }
            }
        }

        stage('Install Server Dependencies') {
            steps {
                dir('server') {
                    bat 'npm install'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv("${SONARQUBE_ENV}") {
                        bat "\"${scannerHome}\\bin\\sonar-scanner.bat\""
                    }
                }
            }
        }

        stage('Build Client') {
            steps {
                dir('client') {
                    bat 'npm run build'
                }
            }
        }

        stage('Test') {
            steps {
                dir('client') {
                    bat 'npm test'
                }
                dir('server') {
                    bat 'npm test'
                }
            }
        }

        stage('Deliver') {
            steps {
                bat 'if not exist release mkdir release'
                bat 'xcopy client\\dist release\\client-dist /E /I /Y'
                bat 'xcopy server release\\server-src /E /I /Y'
                archiveArtifacts artifacts: 'release/**', fingerprint: true
            }
        }

        stage('Deploy to Dev') {
            steps {
                echo 'Deploying to DEV environment...'
                echo 'Launching deployed app in DEV...'
            }
        }

        stage('Deploy to QAT') {
            steps {
                echo 'Deploying to QAT environment...'
            }
        }

        stage('Deploy to Staging') {
            steps {
                echo 'Deploying to STAGING environment...'
            }
        }

        stage('Deploy to Production') {
            steps {
                echo 'Deploying to PRODUCTION environment...'
            }
        }
    }
}