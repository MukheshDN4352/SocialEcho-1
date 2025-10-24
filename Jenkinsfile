pipeline {
    agent any

    triggers {
        // Automatically trigger when GitHub sends a push webhook
        githubPush()
    }

    stages {
        stage('Build') {
            steps {
                echo 'Building project from master branch...'
                // You can add build steps here, e.g.:
                // sh 'mvn clean package'
            }
        }
    }
}
